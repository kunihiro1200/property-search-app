/**
 * Retry utility with exponential backoff
 * 
 * 指数バックオフを使用したリトライユーティリティ
 */

export interface RetryOptions {
  /** 最大試行回数 */
  maxAttempts: number;
  /** 初期遅延時間（ミリ秒） */
  initialDelay: number;
  /** 最大遅延時間（ミリ秒） */
  maxDelay: number;
  /** バックオフ係数 */
  factor: number;
  /** リトライ時のコールバック */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 指数バックオフを使用して関数を実行
 * 
 * @param fn 実行する非同期関数
 * @param options リトライオプション
 * @returns 関数の実行結果
 * @throws 最大試行回数に達した場合、最後のエラーをスロー
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 最大試行回数に達した場合はエラーをスロー
      if (attempt === options.maxAttempts) {
        throw lastError;
      }

      // リトライコールバックを実行
      if (options.onRetry) {
        options.onRetry(lastError, attempt);
      }

      // 指数バックオフで待機
      await sleep(delay);
      delay = Math.min(delay * options.factor, options.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * 指定されたミリ秒数だけ待機
 * 
 * @param ms 待機時間（ミリ秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
