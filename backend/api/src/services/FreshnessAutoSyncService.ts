import { cacheManager, FreshnessStatus } from './CacheManager';
import { SpreadsheetSyncService, DetailedSyncResult } from './SpreadsheetSyncService';
import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorHandler } from './ErrorHandler';

/**
 * 自動同期結果
 */
export interface AutoSyncResult extends DetailedSyncResult {
  triggered: boolean;
  reason: 'stale_cache' | 'no_cache' | 'fresh_cache';
  freshnessStatus: FreshnessStatus;
}

/**
 * 鮮度ベースの自動同期サービス
 * キャッシュの鮮度をチェックし、必要に応じて自動同期を実行
 */
export class FreshnessAutoSyncService {
  private syncService: SpreadsheetSyncService;
  private supabase: SupabaseClient;
  private errorHandler: ErrorHandler;
  private readonly CACHE_KEY = 'sellers:list:all';
  private readonly DEFAULT_THRESHOLD_MINUTES = 5;
  private isRunning = false;
  private subscribers: Array<(data: any[]) => void> = [];

  constructor(syncService: SpreadsheetSyncService, supabase: SupabaseClient) {
    this.syncService = syncService;
    this.supabase = supabase;
    this.errorHandler = new ErrorHandler(supabase);
  }

  /**
   * キャッシュの鮮度をチェック
   */
  async checkFreshness(thresholdMinutes: number = this.DEFAULT_THRESHOLD_MINUTES): Promise<FreshnessStatus> {
    return await cacheManager.checkFreshness(this.CACHE_KEY, thresholdMinutes);
  }

  /**
   * キャッシュが古い場合に同期を実行
   */
  async syncIfStale(thresholdMinutes: number = this.DEFAULT_THRESHOLD_MINUTES): Promise<AutoSyncResult> {
    // 既に実行中の場合はスキップ
    if (this.isRunning) {
      const freshnessStatus = await this.checkFreshness(thresholdMinutes);
      return {
        triggered: false,
        reason: 'fresh_cache',
        freshnessStatus,
        success: true,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [],
      };
    }

    try {
      this.isRunning = true;

      // 鮮度をチェック
      const freshnessStatus = await this.checkFreshness(thresholdMinutes);

      // キャッシュが新鮮な場合はスキップ
      if (!freshnessStatus.isStale) {
        return {
          triggered: false,
          reason: 'fresh_cache',
          freshnessStatus,
          success: true,
          recordsAdded: 0,
          recordsUpdated: 0,
          recordsDeleted: 0,
          errors: [],
        };
      }

      // リトライ機能付きでスプレッドシートから最新データを取得
      const latestData = await this.errorHandler.withRetry(
        () => this.syncService.fetchLatestData(),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
        },
        { operation: 'fetchLatestData', cacheKey: this.CACHE_KEY }
      );

      // 差分を計算
      const diff = await this.syncService.compareWithCache(latestData);

      // 差分を適用（リトライ機能付き）
      const result = await this.errorHandler.withRetry(
        () => this.syncService.applyChanges(diff),
        {
          maxRetries: 2,
          initialDelayMs: 500,
          maxDelayMs: 2000,
          backoffMultiplier: 2,
        },
        { operation: 'applyChanges', recordCount: diff.added.length + diff.updated.length }
      );

      // キャッシュを更新
      await cacheManager.set(this.CACHE_KEY, latestData, 300); // 5分

      // サブスクライバーに通知
      if (result.success && (result.recordsAdded > 0 || result.recordsUpdated > 0 || result.recordsDeleted > 0)) {
        this.notifySubscribers(latestData);
      }

      return {
        triggered: true,
        reason: freshnessStatus.lastUpdateTime ? 'stale_cache' : 'no_cache',
        freshnessStatus,
        ...result,
      };
    } catch (error: any) {
      // エラーをログに記録
      await this.errorHandler.logError(error, {
        operation: 'syncIfStale',
        cacheKey: this.CACHE_KEY,
        thresholdMinutes,
      });
      
      const freshnessStatus = await this.checkFreshness(thresholdMinutes);
      
      return {
        triggered: true,
        reason: freshnessStatus.lastUpdateTime ? 'stale_cache' : 'no_cache',
        freshnessStatus,
        success: false,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: [{ record: 'sync', error: this.errorHandler.getUserFriendlyMessage(error) }],
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * データ更新のサブスクライバーを登録
   */
  subscribe(callback: (data: any[]) => void): () => void {
    this.subscribers.push(callback);
    
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * サブスクライバーに通知
   */
  private notifySubscribers(data: any[]): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }
}