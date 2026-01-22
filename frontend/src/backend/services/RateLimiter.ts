/**
 * レート制限管理クラス
 * 
 * Google Sheets APIのレート制限（100リクエスト/100秒）を管理します。
 * トークンバケットアルゴリズムを使用して、リクエストレートを制御します。
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefillTime: number;
  private requestQueue: Array<() => void> = [];
  private isProcessing: boolean = false;
  
  // 統計情報
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    throttledRequests: 0,
    totalWaitTime: 0,
  };

  /**
   * @param maxRequests - 最大リクエスト数
   * @param timeWindowSeconds - 時間ウィンドウ（秒）
   */
  constructor(maxRequests: number = 100, timeWindowSeconds: number = 100) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.refillRate = maxRequests / timeWindowSeconds; // 1 token per second
    this.lastRefillTime = Date.now();
  }

  /**
   * トークンを補充
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * トークンを取得（バックオフ機能付き）
   * 
   * @param tokensNeeded - 必要なトークン数（デフォルト: 1）
   * @param maxWaitMs - 最大待機時間（ミリ秒、デフォルト: 30000）
   * @returns トークンが取得できたらtrue、タイムアウトしたらfalse
   */
  async acquire(tokensNeeded: number = 1, maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    while (true) {
      this.refillTokens();

      // トークンが十分にある場合
      if (this.tokens >= tokensNeeded) {
        this.tokens -= tokensNeeded;
        this.stats.successfulRequests++;
        return true;
      }

      // タイムアウトチェック
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        return false;
      }

      // 待機時間を計算（指数バックオフ）
      const tokensShortage = tokensNeeded - this.tokens;
      const baseWaitTime = (tokensShortage / this.refillRate) * 1000; // ms
      const backoffFactor = Math.min(1 + (elapsed / maxWaitMs), 2); // 1.0 ~ 2.0
      const waitTime = Math.min(baseWaitTime * backoffFactor, maxWaitMs - elapsed);

      this.stats.throttledRequests++;
      this.stats.totalWaitTime += waitTime;

      await this.sleep(Math.max(100, waitTime));
    }
  }

  /**
   * リクエストを実行（レート制限付き）
   */
  async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      this.refillTokens();

      if (this.tokens >= 1) {
        const request = this.requestQueue.shift();
        if (request) {
          this.tokens -= 1;
          await request();
        }
      } else {
        // トークンが不足している場合は待機
        const waitTime = (1 - this.tokens) / this.refillRate * 1000; // ms
        await this.sleep(Math.max(100, waitTime));
      }
    }

    this.isProcessing = false;
  }

  /**
   * 待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 現在の利用状況を取得
   */
  getUsage(): {
    availableTokens: number;
    maxTokens: number;
    usagePercentage: number;
    queueLength: number;
  } {
    this.refillTokens();
    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
      usagePercentage: ((this.maxTokens - this.tokens) / this.maxTokens) * 100,
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    throttledRequests: number;
    averageWaitTime: number;
    throttleRate: number;
  } {
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      throttledRequests: this.stats.throttledRequests,
      averageWaitTime: this.stats.throttledRequests > 0 
        ? this.stats.totalWaitTime / this.stats.throttledRequests 
        : 0,
      throttleRate: this.stats.totalRequests > 0
        ? this.stats.throttledRequests / this.stats.totalRequests
        : 0,
    };
  }

  /**
   * レート制限設定を更新
   */
  updateConfig(maxRequests: number, timeWindowSeconds: number): void {
    this.maxTokens = maxRequests;
    this.refillRate = maxRequests / timeWindowSeconds;
    this.tokens = Math.min(this.tokens, this.maxTokens);
  }

  /**
   * レート制限に近づいているか確認
   */
  isNearLimit(threshold: number = 0.8): boolean {
    this.refillTokens();
    return this.tokens < this.maxTokens * (1 - threshold);
  }

  /**
   * リセット
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
    this.requestQueue = [];
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      throttledRequests: 0,
      totalWaitTime: 0,
    };
  }
}

// シングルトンインスタンス
export const sheetsRateLimiter = new RateLimiter(100, 100);
