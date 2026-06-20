/**
 * リトライヘルパー
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'],
};

/**
 * 指数バックオフでリトライを実行
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.delayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 最後の試行の場合はエラーをスロー
      if (attempt === opts.maxRetries) {
        break;
      }

      // リトライ可能なエラーかチェック
      const isRetryable =
        opts.retryableErrors.some((code) => error.code === code) ||
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.status === 429 || // Rate limit
        error.status === 500 || // Server error
        error.status === 502 || // Bad gateway
        error.status === 503 || // Service unavailable
        error.status === 504; // Gateway timeout

      if (!isRetryable) {
        break;
      }

      console.log(
        `⚠️ Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms delay. Error: ${error.message}`
      );

      // 待機
      await sleep(delay);

      // 次回の遅延時間を増やす（指数バックオフ）
      delay *= opts.backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * 指定時間待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gmail API用のリトライラッパー
 */
export async function retryGmailApi<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  });
}

/**
 * Calendar API用のリトライラッパー
 */
export async function retryCalendarApi<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  });
}
