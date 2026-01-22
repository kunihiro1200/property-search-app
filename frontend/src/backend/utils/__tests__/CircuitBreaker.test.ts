/**
 * Tests for CircuitBreaker
 */

import { CircuitBreaker } from '../CircuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('closed状態で開始する', () => {
      const breaker = new CircuitBreaker({ threshold: 3, timeout: 1000 });
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('レガシーコンストラクタでも動作する', () => {
      const breaker = new CircuitBreaker(3, 1000);
      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('成功時の動作', () => {
    it('成功した関数を実行できる', async () => {
      const breaker = new CircuitBreaker({ threshold: 3, timeout: 1000 });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('失敗時の動作', () => {
    it('閾値未満の失敗ではclosed状態を維持する', async () => {
      const breaker = new CircuitBreaker({ threshold: 3, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // 2回失敗（閾値は3）
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(1);

      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(2);
    });

    it('閾値に達するとopen状態になる', async () => {
      const breaker = new CircuitBreaker({ threshold: 3, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // 3回失敗（閾値）
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      }

      expect(breaker.getState()).toBe('open');
      expect(breaker.getFailureCount()).toBe(3);
    });

    it('open状態では関数を実行せずにエラーをスローする', async () => {
      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // 2回失敗してopenにする
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      expect(breaker.getState()).toBe('open');

      // open状態では関数を実行しない
      fn.mockClear();
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('リカバリー動作', () => {
    it('タイムアウト後にhalf-open状態に移行する', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // open状態にする
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      expect(breaker.getState()).toBe('open');

      // タイムアウト前はopen状態を維持
      jest.advanceTimersByTime(500);
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
      expect(breaker.getState()).toBe('open');

      // タイムアウト後はhalf-open状態に移行
      jest.advanceTimersByTime(600);
      fn.mockResolvedValue('success');
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');

      jest.useRealTimers();
    });

    it('half-open状態で成功するとclosed状態に戻る', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // open状態にする
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');

      // タイムアウト後、成功させる
      jest.advanceTimersByTime(1100);
      fn.mockResolvedValue('success');
      await breaker.execute(fn);

      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);

      jest.useRealTimers();
    });

    it('half-open状態で失敗するとopen状態に戻る', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // open状態にする
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');

      // タイムアウト後、再度失敗させる
      jest.advanceTimersByTime(1100);
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');

      expect(breaker.getState()).toBe('open');
      // half-open状態で失敗すると、失敗カウントは累積される
      expect(breaker.getFailureCount()).toBe(3);

      jest.useRealTimers();
    });
  });

  describe('reset機能', () => {
    it('resetでclosed状態に戻る', async () => {
      const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));

      // open状態にする
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      await expect(breaker.execute(fn)).rejects.toThrow('Test error');
      expect(breaker.getState()).toBe('open');

      // リセット
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(0);

      // 再度実行可能
      fn.mockResolvedValue('success');
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
    });
  });
});
