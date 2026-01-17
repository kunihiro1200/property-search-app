/**
 * Property Listing REST Sync Service
 * 
 * REST API-based property listing synchronization service
 * 物件リストのREST API同期サービス
 * 
 * 機能:
 * - Supabase REST APIを使用した物件リスト同期
 * - 全件同期と選択同期のサポート
 * - 同期状態の追跡
 * - ヘルスチェック機能
 */

import { SupabaseRestClient, SupabaseRestClientConfig } from './SupabaseRestClient';
import { PropertyListingSyncProcessor, PropertyListing, SyncResult } from './PropertyListingSyncProcessor';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PropertyListingColumnMapper } from './PropertyListingColumnMapper';
import { SyncStateService } from './SyncStateService';
import { SyncMetricsCollector, SyncMetrics } from './SyncMetricsCollector';
import { createClient } from '@supabase/supabase-js';

export interface PropertyListingRestSyncConfig extends SupabaseRestClientConfig {
  /** バッチサイズ */
  batchSize: number;
  /** レート制限（リクエスト/秒） */
  rateLimit: number;
  /** 同時実行数 */
  concurrency?: number;
  /** Google Sheets設定 */
  googleSheets?: {
    spreadsheetId: string;
    sheetName: string;
  };
}

export interface SyncStatus {
  /** 同期ID */
  syncId: string;
  /** 同期タイプ */
  syncType: 'full' | 'selective';
  /** ステータス */
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial';
  /** 開始時刻 */
  startedAt: Date;
  /** 完了時刻 */
  completedAt?: Date;
  /** 総件数 */
  totalItems?: number;
  /** 成功件数 */
  successCount: number;
  /** 失敗件数 */
  failedCount: number;
  /** スキップ件数 */
  skippedCount: number;
  /** エラー詳細 */
  errorDetails?: any;
}

export interface HealthStatus {
  /** ヘルスステータス */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 最後の同期時刻 */
  lastSync?: Date;
  /** エラー率 */
  errorRate: number;
  /** 平均同期時間（秒） */
  avgSyncDuration: number;
  /** キューサイズ */
  queueSize: number;
  /** サーキットブレーカーの状態 */
  circuitBreakerState: string;
}

export interface SyncStatistics {
  /** エラー率 */
  errorRate: number;
  /** 平均同期時間（秒） */
  avgDuration: number;
}

/**
 * Property Listing REST Sync Service
 * 
 * REST APIを使用して物件リストを同期するサービス
 */
export class PropertyListingRestSyncService {
  private restClient: SupabaseRestClient;
  private processor: PropertyListingSyncProcessor;
  private sheetsClient?: GoogleSheetsClient;
  private syncStateService?: SyncStateService;
  private metricsCollector: SyncMetricsCollector;
  private config: PropertyListingRestSyncConfig;
  private apiResponseTimes: number[] = []; // API応答時間を記録

  constructor(config: PropertyListingRestSyncConfig) {
    this.config = config;

    // REST APIクライアントを初期化
    this.restClient = new SupabaseRestClient({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      maxRetryDelay: config.maxRetryDelay,
      retryFactor: config.retryFactor,
      circuitBreakerThreshold: config.circuitBreakerThreshold,
      circuitBreakerTimeout: config.circuitBreakerTimeout,
      timeout: config.timeout,
    });

    // プロセッサーを初期化
    this.processor = new PropertyListingSyncProcessor(
      this.restClient.getClient(),
      {
        batchSize: config.batchSize,
        rateLimit: config.rateLimit,
        concurrency: config.concurrency,
      }
    );

    // SyncStateServiceを初期化
    if (config.supabaseUrl && config.supabaseKey) {
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);
      this.syncStateService = new SyncStateService(supabase);
    }

    // メトリクス収集サービスを初期化
    this.metricsCollector = new SyncMetricsCollector();

    // Google Sheetsクライアントを初期化（オプション）
    if (config.googleSheets) {
      this.sheetsClient = new GoogleSheetsClient({
        spreadsheetId: config.googleSheets.spreadsheetId,
        sheetName: config.googleSheets.sheetName,
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      });
    }
  }

  /**
   * 全物件リストを同期
   * 
   * @returns 同期結果
   */
  async syncAll(): Promise<SyncResult> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();
    this.apiResponseTimes = []; // リセット

    console.log(`[PropertyListingRestSyncService] Starting full sync: ${syncId}`);

    try {
      // Google Sheetsクライアントを認証
      if (this.sheetsClient) {
        await this.sheetsClient.authenticate();
      }

      // Google Sheetsから物件リストを取得
      const listings = await this.fetchFromSheets();

      console.log(
        `[PropertyListingRestSyncService] Fetched ${listings.length} listings from Google Sheets`
      );

      // バッチ処理で同期
      const result = await this.processor.processBatch(listings, syncId);

      // メトリクスを記録
      await this.recordMetrics(syncId, result, startTime);

      console.log(
        `[PropertyListingRestSyncService] Sync ${syncId} completed:`,
        result.stats
      );

      return result;
    } catch (error) {
      console.error(
        `[PropertyListingRestSyncService] Sync ${syncId} failed:`,
        error
      );

      // エラー時もメトリクスを記録
      await this.recordErrorMetrics(syncId, error, startTime);

      throw error;
    }
  }

  /**
   * 指定された物件番号の物件を同期
   * 
   * @param numbers 物件番号の配列
   * @returns 同期結果
   */
  async syncByNumbers(numbers: string[]): Promise<SyncResult> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();
    this.apiResponseTimes = []; // リセット

    console.log(
      `[PropertyListingRestSyncService] Starting selective sync: ${syncId} (${numbers.length} items)`
    );

    try {
      // Google Sheetsクライアントを認証
      if (this.sheetsClient) {
        await this.sheetsClient.authenticate();
      }

      // Google Sheetsから指定された物件を取得
      const listings = await this.fetchByNumbers(numbers);

      console.log(
        `[PropertyListingRestSyncService] Fetched ${listings.length} listings from Google Sheets`
      );

      // バッチ処理で同期
      const result = await this.processor.processBatch(listings, syncId);

      // メトリクスを記録
      await this.recordMetrics(syncId, result, startTime);

      console.log(
        `[PropertyListingRestSyncService] Sync ${syncId} completed:`,
        result.stats
      );

      return result;
    } catch (error) {
      console.error(
        `[PropertyListingRestSyncService] Sync ${syncId} failed:`,
        error
      );

      // エラー時もメトリクスを記録
      await this.recordErrorMetrics(syncId, error, startTime);

      throw error;
    }
  }

  /**
   * 同期状態を取得
   * 
   * @param syncId 同期ID
   * @returns 同期状態
   */
  async getSyncStatus(_syncId: string): Promise<SyncStatus> {
    // TODO: データベースから同期状態を取得
    // 現在は未実装（Task 3.2で実装予定）
    throw new Error('Not implemented yet. Will be implemented in Task 3.2');
  }

  /**
   * ヘルスステータスを取得
   * 
   * @returns ヘルスステータス
   */
  async getHealth(): Promise<HealthStatus> {
    // REST APIクライアントのヘルスチェック
    const healthCheck = await this.restClient.checkHealth();

    // キューサイズを取得
    const queueSize = await this.processor.getQueueSize();

    // データベースから統計情報を取得
    let stats: SyncStatistics;
    let lastSync: Date | undefined;
    
    if (this.syncStateService) {
      try {
        const dbStats = await this.syncStateService.getStatistics();
        const dbHealth = await this.syncStateService.getHealth();
        
        stats = {
          errorRate: dbStats.errorRate,
          avgDuration: dbStats.avgDuration,
        };
        lastSync = dbHealth.lastSync ? new Date(dbHealth.lastSync) : undefined;
      } catch (error) {
        console.error('[PropertyListingRestSyncService] Failed to get statistics from database:', error);
        // エラーが発生した場合は仮の値を使用
        stats = {
          errorRate: 0,
          avgDuration: 0,
        };
      }
    } else {
      // SyncStateServiceが利用できない場合は仮の値
      stats = {
        errorRate: 0,
        avgDuration: 0,
      };
    }

    // ヘルスステータスを決定
    const status = this.determineHealthStatus(healthCheck.healthy, stats);

    return {
      status,
      lastSync,
      errorRate: stats.errorRate,
      avgSyncDuration: stats.avgDuration,
      queueSize,
      circuitBreakerState: this.restClient.getCircuitBreakerState(),
    };
  }

  /**
   * Google Sheetsから全物件リストを取得
   * 
   * @returns 物件リストの配列
   */
  private async fetchFromSheets(): Promise<PropertyListing[]> {
    if (!this.sheetsClient || !this.config.googleSheets) {
      throw new Error('Google Sheets client not configured');
    }

    return this.restClient.executeWithRetry(async () => {
      console.log(
        `[PropertyListingRestSyncService] Fetching from Google Sheets: ${this.config.googleSheets!.spreadsheetId}`
      );

      // Google Sheetsから全データを取得
      const rows = await this.sheetsClient!.readAll();

      console.log(
        `[PropertyListingRestSyncService] Fetched ${rows.length} rows from Google Sheets`
      );

      // データを変換してバリデーション
      const listings = this.transformAndValidateRows(rows);

      console.log(
        `[PropertyListingRestSyncService] Transformed and validated ${listings.length} listings`
      );

      return listings;
    });
  }

  /**
   * Google Sheetsから指定された物件番号の物件を取得
   * 
   * @param numbers 物件番号の配列
   * @returns 物件リストの配列
   */
  private async fetchByNumbers(numbers: string[]): Promise<PropertyListing[]> {
    if (!this.sheetsClient || !this.config.googleSheets) {
      throw new Error('Google Sheets client not configured');
    }

    return this.restClient.executeWithRetry(async () => {
      console.log(
        `[PropertyListingRestSyncService] Fetching ${numbers.length} items from Google Sheets`
      );

      // Google Sheetsから全データを取得
      const rows = await this.sheetsClient!.readAll();

      // 指定された物件番号でフィルタリング
      const numbersSet = new Set(numbers);
      const filteredRows = rows.filter(row => {
        const propertyNumber = String(row['物件番号'] || '').trim();
        return numbersSet.has(propertyNumber);
      });

      console.log(
        `[PropertyListingRestSyncService] Found ${filteredRows.length} matching rows`
      );

      // データを変換してバリデーション
      const listings = this.transformAndValidateRows(filteredRows);

      console.log(
        `[PropertyListingRestSyncService] Transformed and validated ${listings.length} listings`
      );

      return listings;
    });
  }

  /**
   * スプレッドシートの行データを物件リスト形式に変換してバリデーション
   * 
   * @param rows スプレッドシートの行データ
   * @returns 変換された物件リストの配列
   */
  private transformAndValidateRows(rows: any[]): PropertyListing[] {
    const listings: PropertyListing[] = [];
    const mapper = new PropertyListingColumnMapper();

    for (const row of rows) {
      try {
        // 物件番号を取得
        const propertyNumber = String(row['物件番号'] || '').trim();

        // 物件番号が空またはAA形式でない場合はスキップ
        if (!propertyNumber || !propertyNumber.startsWith('AA')) {
          continue;
        }

        // スプレッドシートデータをデータベース形式に変換
        const mappedData = mapper.mapSpreadsheetToDatabase(row);

        // 必須フィールドのバリデーション
        if (!this.validatePropertyListing(mappedData)) {
          console.warn(
            `[PropertyListingRestSyncService] Skipping invalid property: ${propertyNumber}`
          );
          continue;
        }

        // タイムスタンプを追加
        const listing: PropertyListing = {
          property_number: propertyNumber,
          ...mappedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        listings.push(listing);
      } catch (error) {
        console.error(
          `[PropertyListingRestSyncService] Error transforming row:`,
          error
        );
        // エラーが発生した行はスキップして続行
        continue;
      }
    }

    return listings;
  }

  /**
   * 物件リストデータのバリデーション
   * 
   * @param data 物件リストデータ
   * @returns バリデーション結果
   */
  private validatePropertyListing(data: any): boolean {
    // 必須フィールドのチェック
    if (!data.property_number) {
      return false;
    }

    // 物件番号の形式チェック（AA + 数字）
    if (!data.property_number.match(/^AA\d+$/)) {
      return false;
    }

    return true;
  }

  /**
   * ヘルスステータスを決定
   * 
   * @param healthy 接続が正常かどうか
   * @param stats 統計情報
   * @returns ヘルスステータス
   */
  private determineHealthStatus(
    healthy: boolean,
    stats: SyncStatistics
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!healthy) return 'unhealthy';
    if (stats.errorRate > 0.1) return 'unhealthy';
    if (stats.errorRate > 0.05) return 'degraded';
    return 'healthy';
  }

  /**
   * 同期IDを生成
   * 
   * @returns 同期ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * サーキットブレーカーをリセット
   */
  resetCircuitBreaker(): void {
    this.restClient.resetCircuitBreaker();
  }

  /**
   * クライアントをリセット
   */
  reset(): void {
    this.restClient.reset();
    this.processor.clearQueue();
  }

  /**
   * メトリクスを記録
   */
  private async recordMetrics(
    syncId: string,
    result: SyncResult,
    startTime: number
  ): Promise<void> {
    try {
      const durationSeconds = (Date.now() - startTime) / 1000;
      const totalCount = result.stats.total;
      const successCount = result.stats.success;
      const errorCount = result.stats.failed;
      const throughput = totalCount / durationSeconds;

      // エラータイプ別にカウント
      const errorsByType: Record<string, number> = {
        network_error: 0,
        validation_error: 0,
        database_error: 0,
        rate_limit_error: 0,
        unknown_error: 0
      };

      // エラー詳細を分析
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          let errorMessage = '';
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error && typeof error.error === 'object') {
            const errorObj = error.error as any;
            errorMessage = errorObj.message || '';
          }
          
          if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            errorsByType.network_error++;
          } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            errorsByType.validation_error++;
          } else if (errorMessage.includes('database') || errorMessage.includes('constraint')) {
            errorsByType.database_error++;
          } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            errorsByType.rate_limit_error++;
          } else {
            errorsByType.unknown_error++;
          }
        }
      }

      // サーキットブレーカーの状態を取得
      const circuitBreakerState = this.restClient.getCircuitBreakerState() as 'closed' | 'open' | 'half_open';

      const metrics: SyncMetrics = {
        syncId,
        successCount,
        errorCount,
        totalCount,
        durationSeconds,
        throughput,
        errorsByType,
        apiResponseTimes: this.apiResponseTimes,
        circuitBreakerState
      };

      await this.metricsCollector.recordSyncMetrics(metrics);
      
      console.log(`[PropertyListingRestSyncService] メトリクスを記録しました: ${syncId}`);
    } catch (error) {
      console.error('[PropertyListingRestSyncService] メトリクス記録エラー:', error);
      // メトリクス記録の失敗は同期処理に影響を与えない
    }
  }

  /**
   * エラー時のメトリクスを記録
   */
  private async recordErrorMetrics(
    syncId: string,
    _error: any,
    startTime: number
  ): Promise<void> {
    try {
      const durationSeconds = (Date.now() - startTime) / 1000;
      
      const errorsByType: Record<string, number> = {
        network_error: 0,
        validation_error: 0,
        database_error: 0,
        rate_limit_error: 0,
        unknown_error: 1
      };

      const circuitBreakerState = this.restClient.getCircuitBreakerState() as 'closed' | 'open' | 'half_open';

      const metrics: SyncMetrics = {
        syncId,
        successCount: 0,
        errorCount: 1,
        totalCount: 1,
        durationSeconds,
        throughput: 0,
        errorsByType,
        apiResponseTimes: this.apiResponseTimes,
        circuitBreakerState
      };

      await this.metricsCollector.recordSyncMetrics(metrics);
      
      console.log(`[PropertyListingRestSyncService] エラーメトリクスを記録しました: ${syncId}`);
    } catch (metricsError) {
      console.error('[PropertyListingRestSyncService] エラーメトリクス記録エラー:', metricsError);
    }
  }

  /**
   * API応答時間を記録
   */
  recordApiResponseTime(responseTimeMs: number): void {
    this.apiResponseTimes.push(responseTimeMs);
  }
}
