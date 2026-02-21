import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(10, 10); // 10 requests per 10 seconds
  });

  describe('constructor', () => {
    it('初期化時に最大トークン数を設定する', () => {
      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(10);
      expect(usage.maxTokens).toBe(10);
    });

    it('カスタム設定で初期化できる', () => {
      const customLimiter = new RateLimiter(50, 100);
      const usage = customLimiter.getUsage();
      expect(usage.maxTokens).toBe(50);
    });
  });

  describe('acquire', () => {
    it('トークンが利用可能な場合、即座に取得できる', async () => {
      const result = await rateLimiter.acquire(1);
      expect(result).toBe(true);

      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(9);
    });

    it('複数のトークンを一度に取得できる', async () => {
      const result = await rateLimiter.acquire(5);
      expect(result).toBe(true);

      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(5);
    });

    it('トークンが不足している場合、待機する', async () => {
      // すべてのトークンを消費
      await rateLimiter.acquire(10);

      const startTime = Date.now();
      const result = await rateLimiter.acquire(1);
      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeGreaterThan(900); // 少なくとも0.9秒待機
    }, 15000);

    it('最大待機時間を超えた場合、falseを返す', async () => {
      // すべてのトークンを消費
      await rateLimiter.acquire(10);

      const result = await rateLimiter.acquire(1, 100); // 100ms timeout
      expect(result).toBe(false);
    });

    it('指数バックオフを使用して待機する', async () => {
      // すべてのトークンを消費
      await rateLimiter.acquire(10);

      const startTime = Date.now();
      const result = await rateLimiter.acquire(1, 5000);
      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      // バックオフにより待機時間が増加する
      expect(elapsed).toBeGreaterThan(900);
    }, 15000);
  });

  describe('executeRequest', () => {
    it('リクエストを実行し、結果を返す', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await rateLimiter.executeRequest(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('複数のリクエストをキューに入れて順次実行する', async () => {
      const results: string[] = [];
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          rateLimiter.executeRequest(async () => {
            results.push(`request-${i}`);
            return `result-${i}`;
          })
        );
      }

      await Promise.all(promises);
      expect(results).toHaveLength(5);
    });

    it('エラーが発生した場合、エラーを伝播する', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      await expect(rateLimiter.executeRequest(mockFn)).rejects.toThrow('test error');
    });
  });

  describe('getUsage', () => {
    it('現在の使用状況を返す', () => {
      const usage = rateLimiter.getUsage();

      expect(usage).toHaveProperty('availableTokens');
      expect(usage).toHaveProperty('maxTokens');
      expect(usage).toHaveProperty('usagePercentage');
      expect(usage).toHaveProperty('queueLength');
    });

    it('トークン消費後の使用状況を正確に反映する', async () => {
      await rateLimiter.acquire(3);

      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(7);
      expect(usage.usagePercentage).toBeCloseTo(30, 0);
    });
  });

  describe('getStats', () => {
    it('統計情報を返す', () => {
      const stats = rateLimiter.getStats();

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulRequests');
      expect(stats).toHaveProperty('throttledRequests');
      expect(stats).toHaveProperty('averageWaitTime');
      expect(stats).toHaveProperty('throttleRate');
    });

    it('リクエスト後の統計情報を正確に追跡する', async () => {
      await rateLimiter.acquire(1);
      await rateLimiter.acquire(1);

      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
    });

    it('スロットリング発生時の統計情報を記録する', async () => {
      // すべてのトークンを消費
      await rateLimiter.acquire(10);

      // スロットリングが発生するリクエスト
      await rateLimiter.acquire(1, 5000);

      const stats = rateLimiter.getStats();
      expect(stats.throttledRequests).toBeGreaterThan(0);
      expect(stats.averageWaitTime).toBeGreaterThan(0);
    }, 15000);
  });

  describe('updateConfig', () => {
    it('レート制限設定を更新できる', () => {
      rateLimiter.updateConfig(20, 10);

      const usage = rateLimiter.getUsage();
      expect(usage.maxTokens).toBe(20);
    });

    it('設定更新後、新しいレートで動作する', async () => {
      rateLimiter.updateConfig(5, 10);

      await rateLimiter.acquire(5);
      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(0);
    });
  });

  describe('isNearLimit', () => {
    it('制限に近づいている場合、trueを返す', async () => {
      await rateLimiter.acquire(9); // 90% 使用

      const nearLimit = rateLimiter.isNearLimit(0.8); // 80% threshold
      expect(nearLimit).toBe(true);
    });

    it('制限に近づいていない場合、falseを返す', async () => {
      await rateLimiter.acquire(5); // 50% 使用

      const nearLimit = rateLimiter.isNearLimit(0.8); // 80% threshold
      expect(nearLimit).toBe(false);
    });
  });

  describe('reset', () => {
    it('すべての状態をリセットする', async () => {
      await rateLimiter.acquire(5);
      await rateLimiter.executeRequest(async () => 'test');

      rateLimiter.reset();

      const usage = rateLimiter.getUsage();
      const stats = rateLimiter.getStats();

      expect(usage.availableTokens).toBe(10);
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
    });
  });

  describe('トークン補充', () => {
    it('時間経過とともにトークンが補充される', async () => {
      await rateLimiter.acquire(10);

      // 2秒待機（2トークン補充されるはず）
      await new Promise(resolve => setTimeout(resolve, 2000));

      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBeGreaterThanOrEqual(1);
      expect(usage.availableTokens).toBeLessThanOrEqual(3);
    }, 15000);

    it('最大トークン数を超えて補充されない', async () => {
      // 長時間待機
      await new Promise(resolve => setTimeout(resolve, 15000));

      const usage = rateLimiter.getUsage();
      expect(usage.availableTokens).toBe(10);
    }, 20000);
  });
});
