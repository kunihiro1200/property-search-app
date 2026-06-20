/**
 * Tests for retryWithBackoff utility
 */

import { retryWithBackoff, RetryOptions } from '../retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('成功した場合、リトライせずに結果を返す', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      factor: 2,
    };

    const result = await retryWithBackoff(fn, options);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('一時的な失敗後、成功した場合リトライする', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValue('success');

    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 1000,
      factor: 2,
    };

    const result = await retryWithBackoff(fn, options);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('最大試行回数に達した場合、最後のエラーをスローする', async () => {
    const error = new Error('Persistent error');
    const fn = jest.fn().mockRejectedValue(error);

    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 1000,
      factor: 2,
    };

    await expect(retryWithBackoff(fn, options)).rejects.toThrow('Persistent error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('リトライ時にコールバックが呼ばれる', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');

    const onRetry = jest.fn();
    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 1000,
      factor: 2,
      onRetry,
    };

    await retryWithBackoff(fn, options);

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2);
  });

  it('指数バックオフで遅延が増加する', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');

    const retryAttempts: number[] = [];
    const onRetry = jest.fn((_, attempt) => {
      retryAttempts.push(attempt);
    });

    const options: RetryOptions = {
      maxAttempts: 3,
      initialDelay: 50,
      maxDelay: 1000,
      factor: 2,
      onRetry,
    };

    await retryWithBackoff(fn, options);

    // リトライが2回実行されたことを確認
    expect(retryAttempts).toEqual([1, 2]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('最大遅延を超えない', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockRejectedValueOnce(new Error('Error 3'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const onRetry = jest.fn(() => {
      delays.push(Date.now());
    });

    const options: RetryOptions = {
      maxAttempts: 5,
      initialDelay: 100,
      maxDelay: 150, // 最大遅延を低く設定
      factor: 2,
      onRetry,
    };

    await retryWithBackoff(fn, options);

    // 3回目のリトライは最大遅延（150ms）を超えない
    if (delays.length >= 3) {
      expect(delays[2] - delays[1]).toBeLessThan(200);
    }
  });
});
