/**
 * PropertyListingSyncProcessor のユニットテスト
 */

import { PropertyListingSyncProcessor, PropertyListing } from '../PropertyListingSyncProcessor';
import { SupabaseClient } from '@supabase/supabase-js';

// p-queueをモック
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => {
    const tasks: Array<() => Promise<void>> = [];
    let pending = 0;

    return {
      add: jest.fn((fn: () => Promise<void>) => {
        pending++;
        return fn().finally(() => {
          pending--;
        });
      }),
      onIdle: jest.fn(() => Promise.resolve()),
      get size() {
        return tasks.length;
      },
      get pending() {
        return pending;
      },
      clear: jest.fn(),
    };
  });
});

// Supabaseクライアントのモック
const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockUpsert = jest.fn();
  const mockSelect = jest.fn();

  mockFrom.mockReturnValue({
    upsert: mockUpsert,
    select: mockSelect,
  });

  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockSelect.mockResolvedValue({ data: [], error: null });

  return {
    from: mockFrom,
    _mockUpsert: mockUpsert,
    _mockSelect: mockSelect,
  } as any as SupabaseClient & {
    _mockUpsert: jest.Mock;
    _mockSelect: jest.Mock;
  };
};

// テスト用の物件データを生成
const createTestListings = (count: number): PropertyListing[] => {
  return Array.from({ length: count }, (_, i) => ({
    property_number: `AA${String(i + 1).padStart(5, '0')}`,
    property_name: `テスト物件${i + 1}`,
    status: 'active',
  }));
};

describe('PropertyListingSyncProcessor', () => {
  let processor: PropertyListingSyncProcessor;
  let mockSupabase: SupabaseClient & {
    _mockUpsert: jest.Mock;
    _mockSelect: jest.Mock;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    processor = new PropertyListingSyncProcessor(mockSupabase, {
      batchSize: 10,
      rateLimit: 5,
      concurrency: 2,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processBatch', () => {
    it('空の配列を処理できる', async () => {
      const result = await processor.processBatch([], 'test-sync-1');

      expect(result.stats.total).toBe(0);
      expect(result.stats.success).toBe(0);
      expect(result.stats.failed).toBe(0);
      expect(result.status).toBe('completed');
    });

    it('少数の物件を正常に処理できる', async () => {
      const listings = createTestListings(5);
      const result = await processor.processBatch(listings, 'test-sync-2');

      expect(result.stats.total).toBe(5);
      expect(result.stats.success).toBe(5);
      expect(result.stats.failed).toBe(0);
      expect(result.status).toBe('completed');
      expect(mockSupabase._mockUpsert).toHaveBeenCalled();
    });

    it('バッチサイズに従って分割処理する', async () => {
      const listings = createTestListings(25);
      const result = await processor.processBatch(listings, 'test-sync-3');

      expect(result.stats.total).toBe(25);
      expect(result.stats.success).toBe(25);
      expect(result.status).toBe('completed');
      
      // 25件を10件ずつ処理するので、3回呼ばれる
      expect(mockSupabase._mockUpsert).toHaveBeenCalledTimes(3);
    });

    it('バッチ処理でエラーが発生した場合、個別に再試行する', async () => {
      const listings = createTestListings(5);
      
      // 最初の呼び出しでエラー、その後は成功
      mockSupabase._mockUpsert
        .mockRejectedValueOnce(new Error('Batch error'))
        .mockResolvedValue({ data: null, error: null });

      const result = await processor.processBatch(listings, 'test-sync-4');

      expect(result.stats.total).toBe(5);
      expect(result.stats.success).toBe(5);
      expect(result.stats.failed).toBe(0);
      expect(result.status).toBe('completed');
      
      // バッチ処理1回 + 個別処理5回 = 6回
      expect(mockSupabase._mockUpsert).toHaveBeenCalledTimes(6);
    });

    it('個別処理でもエラーが発生した場合、エラーを記録する', async () => {
      const listings = createTestListings(3);
      
      // すべての呼び出しでエラー
      mockSupabase._mockUpsert.mockRejectedValue(new Error('Persistent error'));

      const result = await processor.processBatch(listings, 'test-sync-5');

      expect(result.stats.total).toBe(3);
      expect(result.stats.success).toBe(0);
      expect(result.stats.failed).toBe(3);
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].propertyNumber).toBe('AA00001');
    });

    it('一部成功、一部失敗の場合、partialステータスになる', async () => {
      const listings = createTestListings(5);
      
      // バッチ処理は失敗、個別処理で2件成功、3件失敗
      mockSupabase._mockUpsert
        .mockRejectedValueOnce(new Error('Batch error'))
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockRejectedValueOnce(new Error('Item error'))
        .mockRejectedValueOnce(new Error('Item error'))
        .mockRejectedValueOnce(new Error('Item error'));

      const result = await processor.processBatch(listings, 'test-sync-6');

      expect(result.stats.total).toBe(5);
      expect(result.stats.success).toBe(2);
      expect(result.stats.failed).toBe(3);
      expect(result.status).toBe('partial');
      expect(result.errors).toHaveLength(3);
    });

    it('同期結果に正しいタイムスタンプが含まれる', async () => {
      const listings = createTestListings(2);
      const beforeSync = new Date();
      
      const result = await processor.processBatch(listings, 'test-sync-7');
      
      const afterSync = new Date();

      expect(result.startedAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      expect(result.completedAt.getTime()).toBeLessThanOrEqual(afterSync.getTime());
      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(result.startedAt.getTime());
    });

    it('syncIdが結果に含まれる', async () => {
      const listings = createTestListings(1);
      const syncId = 'custom-sync-id-123';
      
      const result = await processor.processBatch(listings, syncId);

      expect(result.syncId).toBe(syncId);
    });
  });

  describe('getQueueSize', () => {
    it('キューサイズを取得できる', async () => {
      const size = await processor.getQueueSize();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearQueue', () => {
    it('キューをクリアできる', () => {
      expect(() => processor.clearQueue()).not.toThrow();
    });
  });

  describe('バッチ分割', () => {
    it('100件の物件を10件ずつのバッチに分割する', async () => {
      const listings = createTestListings(100);
      const result = await processor.processBatch(listings, 'test-sync-8');

      expect(result.stats.total).toBe(100);
      expect(result.stats.success).toBe(100);
      
      // 100件を10件ずつ処理するので、10回呼ばれる
      expect(mockSupabase._mockUpsert).toHaveBeenCalledTimes(10);
    });

    it('端数のある件数も正しく処理する', async () => {
      const listings = createTestListings(23);
      const result = await processor.processBatch(listings, 'test-sync-9');

      expect(result.stats.total).toBe(23);
      expect(result.stats.success).toBe(23);
      
      // 23件を10件ずつ処理するので、3回呼ばれる（10, 10, 3）
      expect(mockSupabase._mockUpsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーメッセージが正しく記録される', async () => {
      const listings = createTestListings(1);
      const errorMessage = 'Database connection failed';
      
      mockSupabase._mockUpsert.mockRejectedValue(new Error(errorMessage));

      const result = await processor.processBatch(listings, 'test-sync-10');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe(errorMessage);
      expect(result.errors[0].propertyNumber).toBe('AA00001');
      expect(result.errors[0].timestamp).toBeInstanceOf(Date);
    });

    it('非Errorオブジェクトのエラーも処理できる', async () => {
      const listings = createTestListings(1);
      
      mockSupabase._mockUpsert.mockRejectedValue('String error');

      const result = await processor.processBatch(listings, 'test-sync-11');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Unknown error');
    });
  });

  describe('設定', () => {
    it('カスタム設定で初期化できる', () => {
      const customProcessor = new PropertyListingSyncProcessor(mockSupabase, {
        batchSize: 50,
        rateLimit: 20,
        concurrency: 10,
      });

      expect(customProcessor).toBeInstanceOf(PropertyListingSyncProcessor);
    });

    it('デフォルトのconcurrency値が使用される', () => {
      const defaultProcessor = new PropertyListingSyncProcessor(mockSupabase, {
        batchSize: 10,
        rateLimit: 5,
      });

      expect(defaultProcessor).toBeInstanceOf(PropertyListingSyncProcessor);
    });
  });
});
