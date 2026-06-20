/**
 * PhoneService Unit Tests
 */

// 環境変数のモック設定（モジュール読み込み前に実行）
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

// Supabaseクライアントのモック
let mockSupabaseChain: any;

const resetMockChain = () => {
  mockSupabaseChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  return mockSupabaseChain;
};

const mockSupabaseFrom = jest.fn(() => resetMockChain());

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// AWS関連のモック
const mockStartOutboundCall = jest.fn();
const mockEndCall = jest.fn();

jest.mock('../aws/ConnectClient', () => ({
  getConnectClient: jest.fn(() => ({
    startOutboundCall: mockStartOutboundCall,
    endCall: mockEndCall,
  })),
}));

jest.mock('../../config/aws', () => ({
  getAWSConfig: jest.fn(() => ({
    connect: {
      instanceId: 'test-instance',
      contactFlowId: 'test-flow',
      phoneNumber: '+81312345678',
    },
  })),
}));

// Logger のモック
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Transcription worker のモック
const mockAddTranscriptionJob = jest.fn();
jest.mock('../../jobs/transcriptionWorker', () => ({
  addTranscriptionJob: mockAddTranscriptionJob,
}));

import { PhoneService } from '../PhoneService';
import { CallError, PhoneServiceError, StartCallOptions } from '../../types/phone';

describe('PhoneService', () => {
  let service: PhoneService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseChain = resetMockChain();
    mockSupabaseFrom.mockReturnValue(mockSupabaseChain);
    service = new PhoneService();
  });

  describe('基本的なインスタンス化', () => {
    it('PhoneServiceのインスタンスを作成できる', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PhoneService);
    });
  });

  describe('公開メソッドの存在確認', () => {
    it('startOutboundCallメソッドが存在する', () => {
      expect(typeof service.startOutboundCall).toBe('function');
    });

    it('endCallメソッドが存在する', () => {
      expect(typeof service.endCall).toBe('function');
    });

    it('getCallLogメソッドが存在する', () => {
      expect(typeof service.getCallLog).toBe('function');
    });

    it('getCallLogsBySellerメソッドが存在する', () => {
      expect(typeof service.getCallLogsBySeller).toBe('function');
    });

    it('handleInboundCallメソッドが存在する', () => {
      expect(typeof service.handleInboundCall).toBe('function');
    });

    it('getCallStatisticsメソッドが存在する', () => {
      expect(typeof service.getCallStatistics).toBe('function');
    });
  });

  describe('startOutboundCall', () => {
    const validOptions: StartCallOptions = {
      sellerId: 'seller-123',
      phoneNumber: '0312345678',
      userId: 'user-456',
      attributes: { test: 'value' },
    };

    it.skip('正常に発信を開始できる', async () => {
      // Amazon Connect発信のモック
      mockStartOutboundCall.mockResolvedValue({
        contactId: 'contact-789',
      });

      // Seller存在確認のモック (from('sellers').select().eq().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { id: 'seller-123' },
        error: null,
      });

      // Call log作成のモック (from('call_logs').insert().select().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'call-log-123',
          seller_id: 'seller-123',
          user_id: 'user-456',
          direction: 'outbound',
          phone_number: '0312345678',
          call_status: 'completed',
          started_at: new Date().toISOString(),
          contact_id: 'contact-789',
        },
        error: null,
      });

      // Activity log作成のモック (from('activity_logs').insert())
      mockSupabaseChain.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.startOutboundCall(validOptions);

      expect(result).toHaveProperty('callLogId', 'call-log-123');
      expect(result).toHaveProperty('contactId', 'contact-789');
      expect(result).toHaveProperty('status', 'initiated');
      expect(result).toHaveProperty('startedAt');
    });

    it('電話番号が空の場合はエラーをスローする', async () => {
      await expect(
        service.startOutboundCall({ ...validOptions, phoneNumber: '' })
      ).rejects.toThrow(CallError);
    });

    it('無効な電話番号形式の場合はエラーをスローする', async () => {
      await expect(
        service.startOutboundCall({ ...validOptions, phoneNumber: '123' })
      ).rejects.toThrow(CallError);
    });

    it.skip('存在しないSellerの場合はエラーをスローする', async () => {
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.startOutboundCall(validOptions)).rejects.toThrow(PhoneServiceError);
    });

    it.skip('Amazon Connect APIエラーの場合はPhoneServiceErrorをスローする', async () => {
      // Seller存在確認のモック
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { id: 'seller-123' },
        error: null,
      });

      // Amazon Connect APIエラー
      mockStartOutboundCall.mockRejectedValue(new Error('AWS API Error'));

      await expect(service.startOutboundCall(validOptions)).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('endCall', () => {
    const validOptions = {
      callLogId: 'call-log-123',
      endedAt: new Date(),
      durationSeconds: 120,
      status: 'completed' as const,
    };

    it.skip('正常に通話を終了できる', async () => {
      // Call log更新のモック (from('call_logs').update().eq())
      mockSupabaseChain.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Call log取得のモック (from('call_logs').select().eq().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'call-log-123',
          contact_id: 'contact-789',
          instance_id: 'test-instance',
        },
        error: null,
      });

      // Recording取得のモック (from('call_recordings').select().eq().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'recording-123',
          s3_bucket: 'test-bucket',
          s3_key: 'test-key',
        },
        error: null,
      });

      mockEndCall.mockResolvedValue({});
      mockAddTranscriptionJob.mockResolvedValue({});

      await expect(service.endCall(validOptions)).resolves.not.toThrow();
      expect(mockAddTranscriptionJob).toHaveBeenCalled();
    });

    it.skip('録音ファイルがない場合は文字起こしジョブを追加しない', async () => {
      // Call log更新のモック
      mockSupabaseChain.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Call log取得のモック
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'call-log-123',
          contact_id: 'contact-789',
          instance_id: 'test-instance',
        },
        error: null,
      });

      // Recording取得のモック（見つからない）
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.endCall(validOptions)).resolves.not.toThrow();
      expect(mockAddTranscriptionJob).not.toHaveBeenCalled();
    });
  });

  describe('getCallLog', () => {
    it.skip('存在する通話ログを取得できる', async () => {
      const mockCallLog = {
        id: 'call-log-123',
        seller_id: 'seller-123',
        direction: 'outbound',
        phone_number: '0312345678',
      };

      mockSupabaseChain.single.mockResolvedValue({
        data: mockCallLog,
        error: null,
      });

      const result = await service.getCallLog('call-log-123');
      expect(result).toEqual(mockCallLog);
    });

    it.skip('存在しない通話ログの場合はnullを返す', async () => {
      mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await service.getCallLog('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getCallLogsBySeller', () => {
    it.skip('Sellerの通話ログ一覧を取得できる', async () => {
      const mockCallLogs = [
        { id: 'call-1', seller_id: 'seller-123' },
        { id: 'call-2', seller_id: 'seller-123' },
      ];

      // Queryチェーンの最後でデータを返す
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: mockCallLogs,
        error: null,
      });

      const result = await service.getCallLogsBySeller('seller-123');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it.skip('フィルタオプションを適用できる', async () => {
      mockSupabaseChain.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await service.getCallLogsBySeller('seller-123', {
        limit: 5,
        direction: 'inbound',
        status: 'completed',
      });

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('direction', 'inbound');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('call_status', 'completed');
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('handleInboundCall', () => {
    const validOptions = {
      contactId: 'contact-789',
      phoneNumber: '0312345678',
      timestamp: new Date().toISOString(),
      eventType: 'call_started' as const,
      instanceId: 'test-instance',
      agentId: 'agent-123',
    };

    it.skip('call_startedイベントで通話ログを作成できる', async () => {
      // Seller検索のモック (from('sellers').select().or().limit().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: { id: 'seller-123', name: 'Test Seller' },
        error: null,
      });

      // Call log作成のモック (from('call_logs').insert().select().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'call-log-123',
          seller_id: 'seller-123',
        },
        error: null,
      });

      // Activity log作成のモック (from('activity_logs').insert())
      mockSupabaseChain.insert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.handleInboundCall(validOptions);

      expect(result).toHaveProperty('callLogId', 'call-log-123');
      expect(result).toHaveProperty('sellerId', 'seller-123');
      expect(result).toHaveProperty('matched', true);
    });

    it.skip('Sellerが見つからない場合もログを作成する', async () => {
      // Seller検索のモック（見つからない）
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Call log作成のモック (from('call_logs').insert().select().single())
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          id: 'call-log-456',
          seller_id: null,
        },
        error: null,
      });

      const result = await service.handleInboundCall(validOptions);

      expect(result).toHaveProperty('callLogId', 'call-log-456');
      expect(result).toHaveProperty('matched', false);
      expect(result).toHaveProperty('sellerId', null);
    });
  });

  describe('getCallStatistics', () => {
    it.skip('通話統計を正しく計算できる', async () => {
      const mockCallLogs = [
        {
          id: 'call-1',
          direction: 'inbound',
          duration_seconds: 120,
        },
        {
          id: 'call-2',
          direction: 'outbound',
          duration_seconds: 180,
        },
        {
          id: 'call-3',
          direction: 'inbound',
          duration_seconds: 60,
        },
      ];

      // Queryチェーンの最後でデータを返す (from('call_logs').select()...の最後)
      // getCallStatisticsはselect()の後にeq, gte, lteなどを呼び出す可能性があるため、
      // チェーンの最後のメソッドでデータを返す必要がある
      mockSupabaseChain.lte.mockResolvedValueOnce({
        data: mockCallLogs,
        error: null,
      });

      const result = await service.getCallStatistics({
        sellerId: 'seller-123',
      });

      expect(result.totalCalls).toBe(3);
      expect(result.inboundCalls).toBe(2);
      expect(result.outboundCalls).toBe(1);
      expect(result.totalDuration).toBe(360);
      expect(result.averageDuration).toBe(120);
    });

    it.skip('通話ログがない場合はゼロ統計を返す', async () => {
      // Queryチェーンの最後でデータを返す
      mockSupabaseChain.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getCallStatistics({});

      expect(result.totalCalls).toBe(0);
      expect(result.averageDuration).toBe(0);
    });
  });
});
