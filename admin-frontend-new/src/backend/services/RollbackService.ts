import { SupabaseClient } from '@supabase/supabase-js';
import { SyncLogger } from './SyncLogger';

export interface Snapshot {
  id: string;
  created_at: Date;
  seller_count: number;
  description?: string;
  metadata?: any;
}

export interface RollbackResult {
  success: boolean;
  restoredCount: number;
  error?: string;
  duration: number;
}

/**
 * ロールバックサービス
 * 
 * データのスナップショットを作成し、必要に応じてロールバックします。
 */
export class RollbackService {
  private supabase: SupabaseClient;
  private logger: SyncLogger;

  constructor(supabase: SupabaseClient, logger: SyncLogger) {
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * スナップショットを作成
   */
  async createSnapshot(description?: string): Promise<Snapshot> {
    try {
      // 現在の売主データを取得
      const { data: sellers, error: fetchError } = await this.supabase
        .from('sellers')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch sellers: ${fetchError.message}`);
      }

      const sellerCount = sellers?.length || 0;

      // スナップショットを保存
      const { data: snapshot, error: insertError } = await this.supabase
        .from('seller_snapshots')
        .insert({
          seller_count: sellerCount,
          description,
          snapshot_data: sellers,
          created_at: new Date().toISOString(),
        })
        .select('id, created_at, seller_count, description')
        .single();

      if (insertError) {
        throw new Error(`Failed to create snapshot: ${insertError.message}`);
      }

      // ログを記録
      await this.logger.startSyncLog('manual', undefined, {
        operation: 'snapshot_created',
        snapshotId: snapshot.id,
        sellerCount,
      });

      return {
        id: snapshot.id,
        created_at: new Date(snapshot.created_at),
        seller_count: snapshot.seller_count,
        description: snapshot.description,
      };
    } catch (error: any) {
      await this.logger.logError('unknown', error.message, {
        operation: 'create_snapshot',
        stackTrace: error.stack,
      });
      throw error;
    }
  }

  /**
   * スナップショットからロールバック
   */
  async rollback(snapshotId: string): Promise<RollbackResult> {
    const startTime = Date.now();

    try {
      // スナップショットを取得
      const { data: snapshot, error: fetchError } = await this.supabase
        .from('seller_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (fetchError || !snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      const snapshotData = snapshot.snapshot_data;

      if (!Array.isArray(snapshotData)) {
        throw new Error('Invalid snapshot data format');
      }

      // ログを開始
      const logId = await this.logger.startSyncLog('manual', undefined, {
        operation: 'rollback',
        snapshotId,
        targetCount: snapshotData.length,
      });

      // トランザクション的に処理
      // 1. 現在のデータを削除
      const { error: deleteError } = await this.supabase
        .from('sellers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // すべて削除

      if (deleteError) {
        throw new Error(`Failed to delete current data: ${deleteError.message}`);
      }

      // 2. スナップショットデータを復元
      const { error: insertError } = await this.supabase
        .from('sellers')
        .insert(snapshotData);

      if (insertError) {
        throw new Error(`Failed to restore snapshot data: ${insertError.message}`);
      }

      const duration = Date.now() - startTime;

      // ログを完了
      await this.logger.completeSyncLog(logId, 'success', snapshotData.length);

      return {
        success: true,
        restoredCount: snapshotData.length,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      await this.logger.logError(
        SyncLogger.determineErrorType(error),
        error.message,
        {
          operation: 'rollback',
          snapshotId,
          stackTrace: error.stack,
        }
      );

      return {
        success: false,
        restoredCount: 0,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * スナップショット一覧を取得
   */
  async listSnapshots(limit: number = 50): Promise<Snapshot[]> {
    const { data: snapshots, error } = await this.supabase
      .from('seller_snapshots')
      .select('id, created_at, seller_count, description')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch snapshots:', error);
      return [];
    }

    return snapshots?.map(s => ({
      id: s.id,
      created_at: new Date(s.created_at),
      seller_count: s.seller_count,
      description: s.description,
    })) || [];
  }

  /**
   * スナップショットを削除
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('seller_snapshots')
        .delete()
        .eq('id', snapshotId);

      if (error) {
        throw new Error(`Failed to delete snapshot: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      await this.logger.logError('unknown', error.message, {
        operation: 'delete_snapshot',
        snapshotId,
      });
      return false;
    }
  }

  /**
   * 古いスナップショットを自動削除（保持期間を超えたもの）
   */
  async cleanupOldSnapshots(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data: deleted, error } = await this.supabase
        .from('seller_snapshots')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup snapshots: ${error.message}`);
      }

      return deleted?.length || 0;
    } catch (error: any) {
      await this.logger.logError('unknown', error.message, {
        operation: 'cleanup_snapshots',
        retentionDays,
      });
      return 0;
    }
  }
}
