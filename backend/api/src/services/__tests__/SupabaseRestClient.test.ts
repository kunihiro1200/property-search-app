/**
 * Tests for SupabaseRestClient
 */

import { SupabaseRestClient } from '../SupabaseRestClient';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントをモック
jest.mock('@supabase/supabase-js');

describe('SupabaseRestClient', () => {
  const mockConfig = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
    retryAttempts: 3,
    retryDelay: 10,
    maxRetryDelay: 100,
    retryFactor: 2,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 1000,
  };

  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Supabaseクライアントのモックを作成
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('初期化', () => {
    it('正しい設定でクライアントを初期化する', () => {
      const client = new SupabaseRestClient(mockConfig);

      expect(createClient).toHaveBeenCalledWith(
        mockConfig.supabaseUrl,
        mockConfig.supabaseKey,
        expect.objectContaining({
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      );

      expect(client.getCircuitBreakerState()).toBe('closed');
    });

    it('デフォルト値を使用する', () => {
      const minimalConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
      };

      const client = new SupabaseRestClient(minimalConfig);

      expect(createClient).toHaveBeenCalled();
      expect(client.getCircuitBreakerState()).toBe('closed');
    });
  });

  describe('getClient', () => {
    it('Supabaseクライアントを返す', () => {
      const client = new SupabaseRestClient(mockConfig);
      const supabaseClient = client.getClient();

      expect(supabaseClient).toBe(mockSupabaseClient);
    });
  });

  describe('executeWithRetry', () => {
    it('成功した関数を実行する', async () => {
      const client = new SupabaseRestClient(mockConfig);
      const fn = jest.fn().mockResolvedValue('success');

      const result = await client.executeWithRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('一時的な失敗後、リトライして成功する', async () => {
      const client = new SupabaseRestClient(mockConfig);
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const result = await client.executeWithRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('最大試行回数に達した場合、エラーをスローする', async () => {
      const client = new SupabaseRestClient(mockConfig);
      const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(client.executeWithRetry(fn)).rejects.toThrow('Persistent error');
      expect(fn).toHaveBeenCalledTimes(mockConfig.retryAttempts);
    });

    it('サーキットブレーカーがオープンの場合、エラーをスローする', async () => {
      const client = new SupabaseRestClient({
        ...mockConfig,
        circuitBreakerThreshold: 2,
      });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // サーキットブレーカーをオープンにする
      await expect(client.executeWithRetry(fn)).rejects.toThrow();
      await expect(client.executeWithRetry(fn)).rejects.toThrow();

      expect(client.getCircuitBreakerState()).toBe('open');

      // オープン状態では実行されない
      fn.mockClear();
      await expect(client.executeWithRetry(fn)).rejects.toThrow('Circuit breaker is open');
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('正常な接続の場合、healthyを返す', async () => {
      const client = new SupabaseRestClient(mockConfig);
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const health = await client.checkHealth();

      expect(health.healthy).toBe(true);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.circuitBreakerState).toBe('closed');
      expect(health.error).toBeUndefined();
    });

    it('エラーがある場合、unhealthyを返す', async () => {
      const client = new SupabaseRestClient(mockConfig);
      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: { message: 'Connection error' },
      });

      const health = await client.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection error');
      expect(health.circuitBreakerState).toBe('closed');
    });

    it('例外がスローされた場合、unhealthyを返す', async () => {
      const client = new SupabaseRestClient(mockConfig);
      mockSupabaseClient.limit.mockRejectedValue(new Error('Network error'));

      const health = await client.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Network error');
    });
  });

  describe('reset', () => {
    it('クライアントとサーキットブレーカーをリセットする', async () => {
      const client = new SupabaseRestClient({
        ...mockConfig,
        circuitBreakerThreshold: 2,
      });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // サーキットブレーカーをオープンにする
      await expect(client.executeWithRetry(fn)).rejects.toThrow();
      await expect(client.executeWithRetry(fn)).rejects.toThrow();
      expect(client.getCircuitBreakerState()).toBe('open');

      // リセット
      client.reset();

      expect(createClient).toHaveBeenCalledTimes(2); // 初期化 + リセット
      expect(client.getCircuitBreakerState()).toBe('closed');
    });
  });

  describe('resetCircuitBreaker', () => {
    it('サーキットブレーカーのみをリセットする', async () => {
      const client = new SupabaseRestClient({
        ...mockConfig,
        circuitBreakerThreshold: 2,
      });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // サーキットブレーカーをオープンにする
      await expect(client.executeWithRetry(fn)).rejects.toThrow();
      await expect(client.executeWithRetry(fn)).rejects.toThrow();
      expect(client.getCircuitBreakerState()).toBe('open');

      // サーキットブレーカーのみリセット
      client.resetCircuitBreaker();

      expect(createClient).toHaveBeenCalledTimes(1); // 初期化のみ
      expect(client.getCircuitBreakerState()).toBe('closed');
    });
  });
});
