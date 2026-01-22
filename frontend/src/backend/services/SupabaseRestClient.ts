/**
 * Supabase REST API Client with Retry Logic
 * 
 * リトライロジックを備えたSupabase REST APIクライアント
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { retryWithBackoff, RetryOptions } from '../utils/retryWithBackoff';
import { CircuitBreaker } from '../utils/CircuitBreaker';

export interface SupabaseRestClientConfig {
  /** Supabase プロジェクトURL */
  supabaseUrl: string;
  /** Supabase サービスロールキー */
  supabaseKey: string;
  /** リトライ試行回数 */
  retryAttempts?: number;
  /** 初期リトライ遅延（ミリ秒） */
  retryDelay?: number;
  /** 最大リトライ遅延（ミリ秒） */
  maxRetryDelay?: number;
  /** リトライバックオフ係数 */
  retryFactor?: number;
  /** サーキットブレーカー失敗閾値 */
  circuitBreakerThreshold?: number;
  /** サーキットブレーカータイムアウト（ミリ秒） */
  circuitBreakerTimeout?: number;
  /** リクエストタイムアウト（ミリ秒） */
  timeout?: number;
}

export interface HealthCheckResult {
  /** 接続が正常かどうか */
  healthy: boolean;
  /** レスポンス時間（ミリ秒） */
  responseTime?: number;
  /** エラーメッセージ */
  error?: string;
  /** サーキットブレーカーの状態 */
  circuitBreakerState: string;
}

/**
 * Supabase REST APIクライアント
 * 
 * 機能:
 * - 自動リトライ（指数バックオフ）
 * - サーキットブレーカーパターン
 * - 接続ヘルスチェック
 * - エラーハンドリング
 */
export class SupabaseRestClient {
  private client: SupabaseClient;
  private circuitBreaker: CircuitBreaker;
  private config: Required<SupabaseRestClientConfig>;

  constructor(config: SupabaseRestClientConfig) {
    // デフォルト値を設定
    this.config = {
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 16000,
      retryFactor: config.retryFactor ?? 2,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout ?? 60000,
      timeout: config.timeout ?? 30000,
    };

    // Supabaseクライアントを初期化
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // サーキットブレーカーを初期化
    this.circuitBreaker = new CircuitBreaker({
      threshold: this.config.circuitBreakerThreshold,
      timeout: this.config.circuitBreakerTimeout,
    });
  }

  /**
   * Supabaseクライアントを取得
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * リトライロジック付きでクエリを実行
   * 
   * @param fn 実行する関数
   * @returns クエリ結果
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    const retryOptions: RetryOptions = {
      maxAttempts: this.config.retryAttempts,
      initialDelay: this.config.retryDelay,
      maxDelay: this.config.maxRetryDelay,
      factor: this.config.retryFactor,
      onRetry: (error, attempt) => {
        console.warn(
          `[SupabaseRestClient] Retry attempt ${attempt}/${this.config.retryAttempts}:`,
          error.message
        );
      },
    };

    return retryWithBackoff(
      () => this.circuitBreaker.execute(fn),
      retryOptions
    );
  }

  /**
   * 接続ヘルスチェック
   * 
   * @returns ヘルスチェック結果
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // シンプルなクエリで接続をテスト
      const { error } = await this.client
        .from('property_listings')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          healthy: false,
          responseTime,
          error: error.message,
          circuitBreakerState: this.circuitBreaker.getState(),
        };
      }

      return {
        healthy: true,
        responseTime,
        circuitBreakerState: this.circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        circuitBreakerState: this.circuitBreaker.getState(),
      };
    }
  }

  /**
   * サーキットブレーカーの状態を取得
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * サーキットブレーカーをリセット
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * クライアントを再初期化
   */
  reset(): void {
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    this.circuitBreaker.reset();
  }
}
