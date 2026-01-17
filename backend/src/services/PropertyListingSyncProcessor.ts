/**
 * Property Listing Sync Processor
 * 
 * 物件リストをバッチ処理で同期するプロセッサー
 * 
 * 機能:
 * - バッチ処理によるデータ同期
 * - レート制限の適用
 * - エラーハンドリングとリトライ
 * - 進捗追跡
 */

import { SupabaseClient } from '@supabase/supabase-js';
import PQueue from 'p-queue';

export interface PropertyListing {
  property_number: string;
  [key: string]: any;
}

export interface SyncConfig {
  /** バッチサイズ */
  batchSize: number;
  /** レート制限（リクエスト/秒） */
  rateLimit: number;
  /** 同時実行数 */
  concurrency?: number;
  /** 一時的エラーの最大リトライ回数 */
  maxRetries?: number;
  /** リトライ遅延（ミリ秒） */
  retryDelay?: number;
}

export interface SyncError {
  /** 物件番号 */
  propertyNumber: string;
  /** エラーメッセージ */
  error: string;
  /** エラータイプ */
  errorType: 'transient' | 'permanent' | 'validation' | 'unknown';
  /** リトライ回数 */
  retryCount: number;
  /** タイムスタンプ */
  timestamp: Date;
}

export interface SyncResult {
  /** 同期ID */
  syncId: string;
  /** 同期ステータス */
  status: 'completed' | 'failed' | 'partial';
  /** 開始時刻 */
  startedAt: Date;
  /** 完了時刻 */
  completedAt: Date;
  /** 統計情報 */
  stats: {
    /** 総件数 */
    total: number;
    /** 成功件数 */
    success: number;
    /** 失敗件数 */
    failed: number;
    /** スキップ件数 */
    skipped: number;
    /** 一時的エラー件数 */
    transientErrors: number;
    /** 永続的エラー件数 */
    permanentErrors: number;
    /** バリデーションエラー件数 */
    validationErrors: number;
  };
  /** エラー詳細 */
  errors: SyncError[];
}

/**
 * 物件リスト同期プロセッサー
 * 
 * バッチ処理とレート制限を使用して、物件リストを効率的に同期します。
 */
export class PropertyListingSyncProcessor {
  private queue: PQueue;
  private supabase: SupabaseClient;
  private config: Required<SyncConfig>;

  constructor(supabase: SupabaseClient, config: SyncConfig) {
    this.supabase = supabase;
    
    // デフォルト値を設定
    this.config = {
      batchSize: config.batchSize,
      rateLimit: config.rateLimit,
      concurrency: config.concurrency ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    // キューを初期化（レート制限付き）
    this.queue = new PQueue({
      concurrency: this.config.concurrency,
      interval: 1000, // 1秒間隔
      intervalCap: this.config.rateLimit, // 1秒あたりのリクエスト数
    });
  }

  /**
   * 物件リストをバッチ処理で同期
   * 
   * @param listings 同期する物件リスト
   * @param syncId 同期ID
   * @returns 同期結果
   */
  async processBatch(
    listings: PropertyListing[],
    syncId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      syncId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      stats: {
        total: listings.length,
        success: 0,
        failed: 0,
        skipped: 0,
        transientErrors: 0,
        permanentErrors: 0,
        validationErrors: 0,
      },
      errors: [],
    };

    // バッチに分割
    const batches = this.createBatches(listings, this.config.batchSize);

    console.log(
      `[PropertyListingSyncProcessor] Processing ${listings.length} items in ${batches.length} batches`
    );

    // 各バッチを処理
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      await this.queue.add(async () => {
        console.log(
          `[PropertyListingSyncProcessor] Processing batch ${i + 1}/${batches.length} (${batch.length} items)`
        );

        try {
          await this.processSingleBatch(batch, result);
        } catch (error) {
          console.error(
            `[PropertyListingSyncProcessor] Batch ${i + 1} failed:`,
            error
          );
          // バッチ全体が失敗した場合、個別に処理
          await this.processIndividually(batch, result);
        }
      });
    }

    // すべてのタスクが完了するまで待機
    await this.queue.onIdle();

    result.completedAt = new Date();
    
    // ステータスを決定
    if (result.stats.failed === 0) {
      result.status = 'completed';
    } else if (result.stats.success > 0) {
      result.status = 'partial';
    } else {
      result.status = 'failed';
    }

    console.log(
      `[PropertyListingSyncProcessor] Sync ${syncId} completed:`,
      result.stats
    );

    return result;
  }

  /**
   * 単一バッチを処理
   * 
   * @param batch 処理するバッチ
   * @param result 結果オブジェクト
   */
  private async processSingleBatch(
    batch: PropertyListing[],
    result: SyncResult
  ): Promise<void> {
    // Supabase REST APIでバッチupsert
    const { error } = await this.supabase
      .from('property_listings')
      .upsert(batch, {
        onConflict: 'property_number',
        ignoreDuplicates: false,
      });

    if (error) {
      throw error;
    }

    // 成功件数を更新
    result.stats.success += batch.length;
  }

  /**
   * バッチ失敗時に個別に処理
   * 
   * @param batch 処理するバッチ
   * @param result 結果オブジェクト
   */
  private async processIndividually(
    batch: PropertyListing[],
    result: SyncResult
  ): Promise<void> {
    console.log(
      `[PropertyListingSyncProcessor] Processing ${batch.length} items individually`
    );

    for (const listing of batch) {
      try {
        await this.processSingleListingWithRetry(listing, result);
        result.stats.success++;
      } catch (error) {
        const errorType = this.categorizeError(error);
        
        result.stats.failed++;
        
        // エラータイプ別の統計を更新
        switch (errorType) {
          case 'transient':
            result.stats.transientErrors++;
            break;
          case 'permanent':
            result.stats.permanentErrors++;
            break;
          case 'validation':
            result.stats.validationErrors++;
            break;
        }

        result.errors.push({
          propertyNumber: listing.property_number,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType,
          retryCount: 0,
          timestamp: new Date(),
        });

        console.error(
          `[PropertyListingSyncProcessor] Failed to sync ${listing.property_number} (${errorType}):`,
          error
        );
      }
    }
  }

  /**
   * 単一の物件をリトライ付きで処理
   * 
   * @param listing 処理する物件
   * @param result 結果オブジェクト
   */
  private async processSingleListingWithRetry(
    listing: PropertyListing,
    result: SyncResult
  ): Promise<void> {
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        await this.processSingleListing(listing);
        return; // 成功
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errorType = this.categorizeError(error);

        // 永続的エラーまたはバリデーションエラーの場合はリトライしない
        if (errorType === 'permanent' || errorType === 'validation') {
          throw error;
        }

        // 一時的エラーの場合、最大リトライ回数に達していなければリトライ
        if (attempt < this.config.maxRetries!) {
          retryCount++;
          const delay = this.config.retryDelay! * Math.pow(2, attempt);
          
          console.warn(
            `[PropertyListingSyncProcessor] Retrying ${listing.property_number} (attempt ${attempt + 1}/${this.config.maxRetries}) after ${delay}ms`
          );

          await this.sleep(delay);
        }
      }
    }

    // すべてのリトライが失敗した場合
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * エラーを分類
   * 
   * @param error エラーオブジェクト
   * @returns エラータイプ
   */
  private categorizeError(error: any): 'transient' | 'permanent' | 'validation' | 'unknown' {
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';

    // バリデーションエラー
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required') ||
      errorCode === '23502' // NOT NULL violation
    ) {
      return 'validation';
    }

    // 一時的エラー（ネットワーク、タイムアウト、レート制限など）
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorCode === 'PGRST301' || // Supabase rate limit
      errorCode === '429' // HTTP 429 Too Many Requests
    ) {
      return 'transient';
    }

    // 永続的エラー（権限、存在しないテーブルなど）
    if (
      errorMessage.includes('permission denied') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('unauthorized') ||
      errorCode === '42P01' || // Undefined table
      errorCode === '42501' // Insufficient privilege
    ) {
      return 'permanent';
    }

    // その他のエラー
    return 'unknown';
  }

  /**
   * 指定時間待機
   * 
   * @param ms 待機時間（ミリ秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 単一の物件を処理
   * 
   * @param listing 処理する物件
   */
  private async processSingleListing(listing: PropertyListing): Promise<void> {
    const { error } = await this.supabase
      .from('property_listings')
      .upsert(listing, {
        onConflict: 'property_number',
      });

    if (error) {
      throw error;
    }
  }

  /**
   * 配列をバッチに分割
   * 
   * @param items 分割する配列
   * @param batchSize バッチサイズ
   * @returns バッチの配列
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * キューのサイズを取得
   * 
   * @returns キューに入っているタスク数 + 実行中のタスク数
   */
  async getQueueSize(): Promise<number> {
    return this.queue.size + this.queue.pending;
  }

  /**
   * キューをクリア
   */
  clearQueue(): void {
    this.queue.clear();
  }
}
