/**
 * 同期ヘルスチェッカー
 * 
 * 同期システムの健全性を監視します。
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSyncLogService } from './SyncLogService';
import { getEnhancedAutoSyncService, SyncHealthStatus } from './EnhancedAutoSyncService';

export class SyncHealthChecker {
  private supabase: SupabaseClient;
  private syncIntervalMinutes: number;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_KEY!
    );
    this.syncIntervalMinutes = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '5', 10);
  }

  /**
   * 現在の健全性状態を取得
   */
  async getHealthStatus(): Promise<SyncHealthStatus> {
    const syncLogService = getSyncLogService();
    const lastSuccessfulSync = await syncLogService.getLastSuccessfulSync();
    
    // 最新の同期ログを取得
    const history = await syncLogService.getHistory(10);
    
    // 連続失敗回数を計算
    let consecutiveFailures = 0;
    for (const entry of history) {
      if (!entry.success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    // 不足売主数を取得
    let pendingMissingSellers = 0;
    try {
      const enhancedSyncService = getEnhancedAutoSyncService();
      const missingSellers = await enhancedSyncService.detectMissingSellers();
      pendingMissingSellers = missingSellers.length;
    } catch (error) {
      console.warn('Failed to detect missing sellers for health check');
    }

    // 健全性を判定
    const lastSyncTime = lastSuccessfulSync?.executedAt || null;
    const isHealthy = this.calculateHealthStatus(lastSyncTime, consecutiveFailures);

    // 次回同期予定時刻を計算
    const nextScheduledSync = lastSyncTime
      ? new Date(lastSyncTime.getTime() + this.syncIntervalMinutes * 60 * 1000)
      : null;

    return {
      isHealthy,
      lastSyncTime,
      lastSyncSuccess: history.length > 0 ? history[0].success : false,
      pendingMissingSellers,
      syncIntervalMinutes: this.syncIntervalMinutes,
      nextScheduledSync,
      consecutiveFailures,
    };
  }

  /**
   * 健全性を計算
   * 最後の成功同期から3倍の間隔を超えていたらunhealthy
   */
  private calculateHealthStatus(lastSyncTime: Date | null, consecutiveFailures: number): boolean {
    // 連続失敗が3回以上ならunhealthy
    if (consecutiveFailures >= 3) {
      return false;
    }

    // 最後の成功同期がない場合
    if (!lastSyncTime) {
      return false;
    }

    // 3倍の間隔を超えていたらunhealthy
    const thresholdMs = this.syncIntervalMinutes * 3 * 60 * 1000;
    const timeSinceLastSync = Date.now() - lastSyncTime.getTime();
    
    return timeSinceLastSync < thresholdMs;
  }

  /**
   * 健全性をチェックして更新
   */
  async checkAndUpdateHealth(): Promise<void> {
    const status = await this.getHealthStatus();

    // sync_healthテーブルを更新
    const { error } = await this.supabase
      .from('sync_health')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // 固定ID
        last_sync_time: status.lastSyncTime?.toISOString() || null,
        last_sync_success: status.lastSyncSuccess,
        pending_missing_sellers: status.pendingMissingSellers,
        consecutive_failures: status.consecutiveFailures,
        is_healthy: status.isHealthy,
        sync_interval_minutes: status.syncIntervalMinutes,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to update sync health:', error.message);
    }

    // unhealthyの場合は警告ログを出力
    if (!status.isHealthy) {
      console.warn('⚠️ Sync health is UNHEALTHY!');
      console.warn(`   Last successful sync: ${status.lastSyncTime?.toISOString() || 'Never'}`);
      console.warn(`   Consecutive failures: ${status.consecutiveFailures}`);
      console.warn(`   Pending missing sellers: ${status.pendingMissingSellers}`);
    }
  }
}

// シングルトンインスタンス
let syncHealthCheckerInstance: SyncHealthChecker | null = null;

export function getSyncHealthChecker(): SyncHealthChecker {
  if (!syncHealthCheckerInstance) {
    syncHealthCheckerInstance = new SyncHealthChecker();
  }
  return syncHealthCheckerInstance;
}
