/**
 * Property Listing Sync Processor - Error Handling Tests
 * 
 * エラーハンドリング機能のテスト
 */

import { PropertyListingSyncProcessor, PropertyListing, SyncConfig } from '../PropertyListingSyncProcessor';
import { SupabaseClient } from '@supabase/supabase-js';

// モックSupabaseクライアント
const createMockSupabaseClient = (): SupabaseClient => {
  return {
    from: jest.fn().mockReturnThis(),
    upsert: jest.fn(),
  } as any;
};

describe('PropertyListingSyncProcessor - Error Handling', () => {
  let processor: PropertyListingSyncProcessor;
  let mockSupabase: SupabaseClient;
  let config: SyncConfig;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    config = {
      batchSize: 10,
      rateLimit: 5,
      concurrency: 2,
      maxRetries: 3,
      retryDelay: 100,
    };
    processor = new PropertyListingSyncProcessor(mockSupabase, config);
  });

  describe('エラー分類', () => {
    test('一時的エラー: タイムアウトエラーを正しく分類', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1001' },
      ];

      // タイムアウトエラーをシミュレート
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValueOnce({ error: null }),
      });

      const result = await processor.processBatch(listings, 'test-sync-1');

      expect(result.stats.success).toBe(1);
      expect(result.stats.transientErrors).toBe(0); // 最終的に成功したのでカウントされない
    });

    test('一時的エラー: レート制限エラーを正しく分類', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1002' },
      ];

      // レート制限エラーをシミュレート
      const rateLimitError = new Error('rate limit exceeded');
      (rateLimitError as any).code = '429';

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockRejectedValue(rateLimitError),
      });

      const result = await processor.processBatch(listings, 'test-sync-2');

      expect(result.stats.failed).toBe(1);
      expect(result.stats.transientErrors).toBe(1);
      expect(result.errors[0].errorType).toBe('transient');
    });

    test('永続的エラー: 権限エラーを正しく分類', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1003' },
      ];

      // 権限エラーをシミュレート
      const permissionError = new Error('permission denied');
      (permissionError as any).code = '42501';

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockRejectedValue(permissionError),
      });

      const result = await processor.processBatch(listings, 'test-sync-3');

      expect(result.stats.failed).toBe(1);
      expect(result.stats.permanentErrors).toBe(1);
      expect(result.errors[0].errorType).toBe('permanent');
    });

    test('バリデーションエラー: 必須フィールドエラーを正しく分類', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1004' },
      ];

      // バリデーションエラーをシミュレート
      const validationError = new Error('required field missing');
      (validationError as any).code = '23502';

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockRejectedValue(validationError),
      });

      const result = await processor.processBatch(listings, 'test-sync-4');

      expect(result.stats.failed).toBe(1);
      expect(result.stats.validationErrors).toBe(1);
      expect(result.errors[0].errorType).toBe('validation');
    });
  });

  describe('リトライロジック', () => {
    test('一時的エラー: 最大リトライ回数まで再試行', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1005' },
      ];

      const upsertMock = jest.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT')); // 4回目も失敗

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
      });

      const result = await processor.processBatch(listings, 'test-sync-5');

      // maxRetries=3なので、初回 + 3回リトライ = 合計4回呼ばれる
      expect(upsertMock).toHaveBeenCalledTimes(4);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.transientErrors).toBe(1);
    });

    test('一時的エラー: リトライで成功', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1006' },
      ];

      const upsertMock = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({ error: null }); // 3回目で成功

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
      });

      const result = await processor.processBatch(listings, 'test-sync-6');

      expect(upsertMock).toHaveBeenCalledTimes(3);
      expect(result.stats.success).toBe(1);
      expect(result.stats.failed).toBe(0);
    });

    test('永続的エラー: リトライしない', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1007' },
      ];

      const upsertMock = jest.fn()
        .mockRejectedValue(new Error('permission denied'));

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
      });

      const result = await processor.processBatch(listings, 'test-sync-7');

      // 永続的エラーなので1回だけ呼ばれる（リトライしない）
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.permanentErrors).toBe(1);
    });

    test('バリデーションエラー: リトライしない', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1008' },
      ];

      const upsertMock = jest.fn()
        .mockRejectedValue(new Error('validation failed'));

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
      });

      const result = await processor.processBatch(listings, 'test-sync-8');

      // バリデーションエラーなので1回だけ呼ばれる（リトライしない）
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.validationErrors).toBe(1);
    });
  });

  describe('バッチエラーハンドリング', () => {
    test('バッチ全体が失敗した場合、個別に処理', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1009' },
        { property_number: 'AA1010' },
        { property_number: 'AA1011' },
      ];

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockImplementation((data: any) => {
          callCount++;
          // 最初のバッチ呼び出しは失敗
          if (Array.isArray(data)) {
            return Promise.reject(new Error('Batch failed'));
          }
          // 個別呼び出しは成功
          return Promise.resolve({ error: null });
        }),
      });

      const result = await processor.processBatch(listings, 'test-sync-9');

      // バッチ1回 + 個別3回 = 合計4回
      expect(callCount).toBe(4);
      expect(result.stats.success).toBe(3);
      expect(result.stats.failed).toBe(0);
    });

    test('バッチ失敗後、個別処理で一部失敗', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1012' },
        { property_number: 'AA1013' },
        { property_number: 'AA1014' },
      ];

      let callCount = 0;
      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockImplementation((data: any) => {
          callCount++;
          // 最初のバッチ呼び出しは失敗
          if (Array.isArray(data)) {
            return Promise.reject(new Error('Batch failed'));
          }
          // 個別呼び出し: AA1013だけ失敗
          if (data.property_number === 'AA1013') {
            return Promise.reject(new Error('validation failed'));
          }
          return Promise.resolve({ error: null });
        }),
      });

      const result = await processor.processBatch(listings, 'test-sync-10');

      expect(result.stats.success).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.validationErrors).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].propertyNumber).toBe('AA1013');
    });
  });

  describe('エラー統計', () => {
    test('複数のエラータイプを正しくカウント', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1015' }, // 成功
        { property_number: 'AA1016' }, // 一時的エラー
        { property_number: 'AA1017' }, // 永続的エラー
        { property_number: 'AA1018' }, // バリデーションエラー
        { property_number: 'AA1019' }, // 成功
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockImplementation((data: any) => {
          const propertyNumber = data.property_number;
          
          if (propertyNumber === 'AA1016') {
            return Promise.reject(new Error('timeout'));
          }
          if (propertyNumber === 'AA1017') {
            return Promise.reject(new Error('permission denied'));
          }
          if (propertyNumber === 'AA1018') {
            return Promise.reject(new Error('validation failed'));
          }
          
          return Promise.resolve({ error: null });
        }),
      });

      const result = await processor.processBatch(listings, 'test-sync-11');

      expect(result.stats.total).toBe(5);
      expect(result.stats.success).toBe(2);
      expect(result.stats.failed).toBe(3);
      expect(result.stats.transientErrors).toBe(1);
      expect(result.stats.permanentErrors).toBe(1);
      expect(result.stats.validationErrors).toBe(1);
    });
  });

  describe('同期ステータス', () => {
    test('全件成功: completed', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1020' },
        { property_number: 'AA1021' },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await processor.processBatch(listings, 'test-sync-12');

      expect(result.status).toBe('completed');
      expect(result.stats.success).toBe(2);
      expect(result.stats.failed).toBe(0);
    });

    test('一部失敗: partial', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1022' },
        { property_number: 'AA1023' },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockImplementation((data: any) => {
          if (data.property_number === 'AA1023') {
            return Promise.reject(new Error('failed'));
          }
          return Promise.resolve({ error: null });
        }),
      });

      const result = await processor.processBatch(listings, 'test-sync-13');

      expect(result.status).toBe('partial');
      expect(result.stats.success).toBe(1);
      expect(result.stats.failed).toBe(1);
    });

    test('全件失敗: failed', async () => {
      const listings: PropertyListing[] = [
        { property_number: 'AA1024' },
        { property_number: 'AA1025' },
      ];

      (mockSupabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockRejectedValue(new Error('failed')),
      });

      const result = await processor.processBatch(listings, 'test-sync-14');

      expect(result.status).toBe('failed');
      expect(result.stats.success).toBe(0);
      expect(result.stats.failed).toBe(2);
    });
  });
});
