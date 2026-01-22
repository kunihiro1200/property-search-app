import { SpreadsheetSyncService } from './SpreadsheetSyncService';
import { SyncLogger } from './SyncLogger';
import { SupabaseClient } from '@supabase/supabase-js';

export type SyncMode = 'full' | 'incremental';

export interface ManualSyncResult {
  success: boolean;
  mode: SyncMode;
  totalRows: number;
  successCount: number;
  failureCount: number;
  duration: number;
  errors: Array<{ sellerId: string; error: string }>;
}

export interface SyncProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  percentage: number;
  currentSellerId?: string;
}

/**
 * 手動同期サービス
 * 
 * 管理者が手動で同期を実行する機能を提供します。
 * 全データ同期と差分同期をサポートします。
 */
export class ManualSyncService {
  private syncService: SpreadsheetSyncService;
  private logger: SyncLogger;
  private supabase: SupabaseClient;
  private isRunning: boolean = false;
  private currentProgress: SyncProgress | null = null;
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];

  constructor(
    syncService: SpreadsheetSyncService,
    logger: SyncLogger,
    supabase: SupabaseClient
  ) {
    this.syncService = syncService;
    this.logger = logger;
    this.supabase = supabase;
  }

  /**
   * 手動同期を実行
   */
  async executeManualSync(mode: SyncMode = 'incremental'): Promise<ManualSyncResult> {
    // 同時実行チェック
    if (this.isRunning) {
      throw new Error('Sync is already running. Please wait for it to complete.');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // ログを開始
      const logId = await this.logger.startSyncLog('manual', undefined, { mode });

      let sellerIds: string[];

      if (mode === 'full') {
        // 全データ同期
        sellerIds = await this.getAllSellerIds();
      } else {
        // 差分同期（未同期または更新されたデータ）
        sellerIds = await this.syncService.getUnsyncedSellers(10000);
      }

      const totalRows = sellerIds.length;
      const errors: Array<{ sellerId: string; error: string }> = [];
      let successCount = 0;
      let failureCount = 0;

      // 進行状況を初期化
      this.currentProgress = {
        total: totalRows,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percentage: 0,
      };

      // バッチサイズ
      const batchSize = 100;

      // バッチ処理
      for (let i = 0; i < sellerIds.length; i += batchSize) {
        const batch = sellerIds.slice(i, i + batchSize);

        try {
          const result = await this.syncService.syncBatchToSpreadsheet(batch);

          successCount += result.successCount;
          failureCount += result.failureCount;
          errors.push(...result.errors);

          // 進行状況を更新
          this.currentProgress = {
            total: totalRows,
            processed: i + batch.length,
            succeeded: successCount,
            failed: failureCount,
            percentage: Math.round(((i + batch.length) / totalRows) * 100),
            currentSellerId: batch[batch.length - 1],
          };

          // 進行状況を通知
          this.notifyProgress(this.currentProgress);
        } catch (error: any) {
          // バッチ全体が失敗した場合
          failureCount += batch.length;
          batch.forEach(sellerId => {
            errors.push({ sellerId, error: error.message });
          });

          // エラーログを記録
          await this.logger.logError(
            SyncLogger.determineErrorType(error),
            error.message,
            {
              operation: 'manual_sync_batch',
              metadata: { batchSize: batch.length, mode },
            }
          );
        }
      }

      const duration = Date.now() - startTime;

      // ログを完了
      await this.logger.completeSyncLog(
        logId,
        failureCount === 0 ? 'success' : 'failure',
        successCount,
        failureCount > 0 ? `${failureCount} failures` : undefined
      );

      return {
        success: failureCount === 0,
        mode,
        totalRows,
        successCount,
        failureCount,
        duration,
        errors,
      };
    } finally {
      this.isRunning = false;
      this.currentProgress = null;
    }
  }

  /**
   * すべての売主IDを取得
   */
  private async getAllSellerIds(): Promise<string[]> {
    const { data: sellers, error } = await this.supabase
      .from('sellers')
      .select('id')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch seller IDs: ${error.message}`);
    }

    return sellers?.map(s => s.id) || [];
  }

  /**
   * 同期が実行中かどうか
   */
  isRunningSync(): boolean {
    return this.isRunning;
  }

  /**
   * 現在の進行状況を取得
   */
  getCurrentProgress(): SyncProgress | null {
    return this.currentProgress;
  }

  /**
   * 進行状況の通知を登録
   */
  onProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * 進行状況の通知を解除
   */
  offProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 進行状況を通知
   */
  private notifyProgress(progress: SyncProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * 進行状況の通知をクリア
   */
  clearProgressCallbacks(): void {
    this.progressCallbacks = [];
  }
}
