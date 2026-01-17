/**
 * InquiryHistoryService ユニットテスト
 * 
 * 各メソッドの動作を検証
 */

import { InquiryHistoryService } from '../InquiryHistoryService';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントをモック化
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('InquiryHistoryService', () => {
  let service: InquiryHistoryService;
  let mockSupabase: any;

  beforeEach(() => {
    // Supabaseクライアントのモックを作成
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // 環境変数を設定
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    service = new InquiryHistoryService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInquiryHistories', () => {
    it('正常系: 売主IDで問合せ履歴を取得できる', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          seller_id: sellerId,
          inquiry_date: '2025-01-15',
          inquiry_site: 'ウ',
          inquiry_reason: '売却検討',
          is_current_status: true,
          notes: 'テストメモ',
          created_at: '2025-01-15T00:00:00Z',
          updated_at: '2025-01-15T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getInquiryHistories(sellerId);

      expect(mockSupabase.from).toHaveBeenCalledWith('inquiry_histories');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('seller_id', sellerId);
      expect(mockSupabase.order).toHaveBeenCalledWith('inquiry_date', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0].sellerId).toBe(sellerId);
      expect(result[0].inquirySite).toBe('ウ');
    });

    it('異常系: データベースエラー時にエラーをスローする', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.getInquiryHistories(sellerId)).rejects.toThrow(
        'Failed to fetch inquiry histories: Database error'
      );
    });
  });

  describe('createInquiryHistory', () => {
    it('正常系: 問合せ履歴を作成できる', async () => {
      const request = {
        sellerId: '123e4567-e89b-12d3-a456-426614174000',
        inquiryDate: new Date('2025-01-15'),
        inquirySite: 'ウ',
        inquiryReason: '売却検討',
        isCurrentStatus: true,
        notes: 'テストメモ',
      };

      const mockData = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        seller_id: request.sellerId,
        inquiry_date: request.inquiryDate.toISOString(),
        inquiry_site: request.inquirySite,
        inquiry_reason: request.inquiryReason,
        is_current_status: request.isCurrentStatus,
        notes: request.notes,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.createInquiryHistory(request);

      expect(mockSupabase.from).toHaveBeenCalledWith('inquiry_histories');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        seller_id: request.sellerId,
        inquiry_date: request.inquiryDate,
        inquiry_site: request.inquirySite,
        inquiry_reason: request.inquiryReason,
        is_current_status: request.isCurrentStatus,
        notes: request.notes,
      });
      expect(result.sellerId).toBe(request.sellerId);
      expect(result.inquirySite).toBe(request.inquirySite);
    });

    it('異常系: データベースエラー時にエラーをスローする', async () => {
      const request = {
        sellerId: '123e4567-e89b-12d3-a456-426614174000',
        inquiryDate: new Date('2025-01-15'),
        inquirySite: 'ウ',
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(service.createInquiryHistory(request)).rejects.toThrow(
        'Failed to create inquiry history: Insert failed'
      );
    });
  });

  describe('updateCurrentStatus', () => {
    it('正常系: is_current_statusを更新できる', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      // 1回目の呼び出し（リセット）
      const mockResetChain = {
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      
      // 2回目の呼び出し（更新）- 2つのeq呼び出しをチェーン
      const mockSecondEq = {
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      const mockFirstEq = {
        eq: jest.fn().mockReturnValue(mockSecondEq),
      };

      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockResetChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockFirstEq),
        });

      await service.updateCurrentStatus(sellerId, inquiryHistoryId);

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'inquiry_histories');
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'inquiry_histories');
    });

    it('異常系: リセット時のエラーをスローする', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      const mockResetChain = {
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Reset failed' },
        }),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue(mockResetChain),
      });

      await expect(service.updateCurrentStatus(sellerId, inquiryHistoryId)).rejects.toThrow(
        'Failed to reset current status: Reset failed'
      );
    });

    it('異常系: 更新時のエラーをスローする', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      // 1回目の呼び出し（リセット成功）
      const mockResetChain = {
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // 2回目の呼び出し（更新失敗）- 2つのeq呼び出しをチェーン
      const mockSecondEq = {
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      };
      const mockFirstEq = {
        eq: jest.fn().mockReturnValue(mockSecondEq),
      };

      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockResetChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockFirstEq),
        });

      await expect(service.updateCurrentStatus(sellerId, inquiryHistoryId)).rejects.toThrow(
        'Failed to update current status: Update failed'
      );
    });
  });

  describe('updateInquiryHistory', () => {
    it('正常系: 問合せ履歴を更新できる', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      const request = {
        inquirySite: 'L',
        inquiryReason: '更新された理由',
      };

      const mockData = {
        id,
        seller_id: '123e4567-e89b-12d3-a456-426614174000',
        inquiry_date: '2025-01-15',
        inquiry_site: request.inquirySite,
        inquiry_reason: request.inquiryReason,
        is_current_status: true,
        notes: 'テストメモ',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.updateInquiryHistory(id, request);

      expect(mockSupabase.from).toHaveBeenCalledWith('inquiry_histories');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        inquiry_site: request.inquirySite,
        inquiry_reason: request.inquiryReason,
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
      expect(result.inquirySite).toBe(request.inquirySite);
      expect(result.inquiryReason).toBe(request.inquiryReason);
    });

    it('異常系: データベースエラー時にエラーをスローする', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';
      const request = { inquirySite: 'L' };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(service.updateInquiryHistory(id, request)).rejects.toThrow(
        'Failed to update inquiry history: Update failed'
      );
    });
  });

  describe('deleteInquiryHistory', () => {
    it('正常系: 問合せ履歴を削除できる', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';

      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      await service.deleteInquiryHistory(id);

      expect(mockSupabase.from).toHaveBeenCalledWith('inquiry_histories');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
    });

    it('異常系: データベースエラー時にエラーをスローする', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174001';

      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(service.deleteInquiryHistory(id)).rejects.toThrow(
        'Failed to delete inquiry history: Delete failed'
      );
    });
  });
});
