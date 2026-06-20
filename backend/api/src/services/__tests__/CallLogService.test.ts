/**
 * CallLogService Unit Tests
 */

// Supabaseクライアントのモック
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseInsert = jest.fn().mockReturnThis();
const mockSupabaseUpdate = jest.fn().mockReturnThis();
const mockSupabaseDelete = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseIn = jest.fn().mockReturnThis();
const mockSupabaseNot = jest.fn().mockReturnThis();
const mockSupabaseOr = jest.fn().mockReturnThis();
const mockSupabaseLimit = jest.fn().mockReturnThis();
const mockSupabaseRange = jest.fn().mockReturnThis();
const mockSupabaseOrder = jest.fn().mockReturnThis();
const mockSupabaseGte = jest.fn().mockReturnThis();
const mockSupabaseLte = jest.fn().mockReturnThis();
const mockSupabaseLt = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
      eq: mockSupabaseEq,
      in: mockSupabaseIn,
      not: mockSupabaseNot,
      or: mockSupabaseOr,
      limit: mockSupabaseLimit,
      range: mockSupabaseRange,
      order: mockSupabaseOrder,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      lt: mockSupabaseLt,
      single: mockSupabaseSingle,
    }),
  },
}));

// Logger のモック
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { CallLogService } from '../CallLogService';
import { PhoneServiceError } from '../../types/phone';

describe('CallLogService', () => {
  let service: CallLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CallLogService();
  });

  describe('基本的なインスタンス化', () => {
    it('CallLogServiceのインスタンスを作成できる', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CallLogService);
    });
  });

  describe('公開メソッドの存在確認', () => {
    it('createCallLogメソッドが存在する', () => {
      expect(typeof service.createCallLog).toBe('function');
    });

    it('updateCallLogメソッドが存在する', () => {
      expect(typeof service.updateCallLog).toBe('function');
    });

    it('getCallLogByIdメソッドが存在する', () => {
      expect(typeof service.getCallLogById).toBe('function');
    });

    it('getCallLogsメソッドが存在する', () => {
      expect(typeof service.getCallLogs).toBe('function');
    });

    it('getCallLogsBySellerメソッドが存在する', () => {
      expect(typeof service.getCallLogsBySeller).toBe('function');
    });

    it('getCallStatisticsメソッドが存在する', () => {
      expect(typeof service.getCallStatistics).toBe('function');
    });

    it('createActivityLogメソッドが存在する', () => {
      expect(typeof service.createActivityLog).toBe('function');
    });

    it('deleteCallLogメソッドが存在する', () => {
      expect(typeof service.deleteCallLog).toBe('function');
    });

    it('archiveOldCallLogsメソッドが存在する', () => {
      expect(typeof service.archiveOldCallLogs).toBe('function');
    });
  });

  describe('createCallLog', () => {
    const validData = {
      sellerId: 'seller-123',
      userId: 'user-456',
      direction: 'outbound' as const,
      phoneNumber: '0312345678',
      callStatus: 'completed' as const,
      startedAt: new Date(),
      durationSeconds: 120,
    };

    it('正常に通話ログを作成できる', async () => {
      const mockCallLog = {
        id: 'call-log-123',
        ...validData,
        created_at: new Date().toISOString(),
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockCallLog,
        error: null,
      });

      const result = await service.createCallLog(validData);

      expect(result).toEqual(mockCallLog);
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it('データベースエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.createCallLog(validData)).rejects.toThrow(PhoneServiceError);
    });
  });

  describe('updateCallLog', () => {
    const callLogId = 'call-log-123';
    const updates = {
      callStatus: 'completed' as const,
      endedAt: new Date(),
      durationSeconds: 120,
    };

    it('正常に通話ログを更新できる', async () => {
      const mockUpdatedLog = {
        id: callLogId,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockUpdatedLog,
        error: null,
      });

      const result = await service.updateCallLog(callLogId, updates);

      expect(result).toEqual(mockUpdatedLog);
      expect(mockSupabaseUpdate).toHaveBeenCalled();
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', callLogId);
    });

    it('データベースエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(service.updateCallLog(callLogId, updates)).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('getCallLogById', () => {
    const callLogId = 'call-log-123';

    it('存在する通話ログを詳細情報付きで取得できる', async () => {
      const mockCallLog = {
        id: callLogId,
        seller_id: 'seller-123',
        user_id: 'user-456',
      };

      const mockSeller = {
        seller_number: 'AA12345',
        name1: 'Test',
        name2: 'Seller',
      };

      const mockUser = {
        name: 'Test User',
      };

      // Call log取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockCallLog,
        error: null,
      });

      // Seller取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockSeller,
        error: null,
      });

      // User取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await service.getCallLogById(callLogId);

      expect(result).toHaveProperty('id', callLogId);
      expect(result).toHaveProperty('seller_name', 'Test Seller');
      expect(result).toHaveProperty('seller_number', 'AA12345');
      expect(result).toHaveProperty('user_name', 'Test User');
    });

    it('存在しない通話ログの場合はnullを返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.getCallLogById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getCallLogs', () => {
    it('通話ログ一覧をページネーション付きで取得できる', async () => {
      const mockCallLogs = [
        { id: 'call-1', seller_id: 'seller-123', user_id: 'user-456' },
        { id: 'call-2', seller_id: 'seller-456', user_id: 'user-789' },
      ];

      mockSupabaseSingle.mockResolvedValue({
        data: mockCallLogs,
        error: null,
        count: 2,
      });

      const result = await service.getCallLogs({
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('calls');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.total).toBe(2);
    });

    it('フィルタ条件を適用できる', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await service.getCallLogs({
        page: 1,
        limit: 20,
        sellerId: 'seller-123',
        direction: 'inbound',
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(mockSupabaseEq).toHaveBeenCalledWith('seller_id', 'seller-123');
      expect(mockSupabaseEq).toHaveBeenCalledWith('direction', 'inbound');
      expect(mockSupabaseEq).toHaveBeenCalledWith('call_status', 'completed');
      expect(mockSupabaseGte).toHaveBeenCalled();
      expect(mockSupabaseLte).toHaveBeenCalled();
    });
  });

  describe('getCallStatistics', () => {
    it('通話統計を正しく計算できる', async () => {
      const mockCallLogs = [
        {
          id: 'call-1',
          direction: 'inbound',
          call_status: 'completed',
          duration_seconds: 120,
          user_id: 'user-1',
        },
        {
          id: 'call-2',
          direction: 'outbound',
          call_status: 'completed',
          duration_seconds: 180,
          user_id: 'user-1',
        },
      ];

      const mockUsers = [{ id: 'user-1', name: 'Test User' }];

      const mockTranscriptions = [
        { sentiment: 'positive', detected_keywords: ['購入', '検討'] },
        { sentiment: 'neutral', detected_keywords: ['確認', '検討'] },
      ];

      // Call logs取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockCallLogs,
        error: null,
      });

      // Users取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      });

      // Transcriptions取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockTranscriptions,
        error: null,
      });

      const result = await service.getCallStatistics({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.totalCalls).toBe(2);
      expect(result.inboundCalls).toBe(1);
      expect(result.outboundCalls).toBe(1);
      expect(result.totalDurationSeconds).toBe(300);
      expect(result.averageDurationSeconds).toBe(150);
      expect(result.callsByUser).toHaveLength(1);
      expect(result.topKeywords).toBeDefined();
    });

    it('データがない場合はゼロ統計を返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getCallStatistics({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.totalCalls).toBe(0);
      expect(result.averageDurationSeconds).toBe(0);
    });
  });

  describe('deleteCallLog', () => {
    it('正常に通話ログを削除できる', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.deleteCallLog('call-log-123')).resolves.not.toThrow();
      expect(mockSupabaseDelete).toHaveBeenCalled();
    });

    it('データベースエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(service.deleteCallLog('call-log-123')).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('archiveOldCallLogs', () => {
    it('古い通話ログを正しくアーカイブできる', async () => {
      const mockOldLogs = [{ id: 'call-1' }, { id: 'call-2' }];

      // Select old logs
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockOldLogs,
        error: null,
      });

      // Delete old logs
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.archiveOldCallLogs(90);

      expect(result).toBe(2);
      expect(mockSupabaseLt).toHaveBeenCalled();
      expect(mockSupabaseDelete).toHaveBeenCalled();
    });

    it('古いログがない場合は0を返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.archiveOldCallLogs(90);

      expect(result).toBe(0);
    });
  });
});
