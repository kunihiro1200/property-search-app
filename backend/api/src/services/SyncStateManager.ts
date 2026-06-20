/**
 * SyncStateManager
 * 同期状態の管理を行うサービス
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SyncState {
  id: string;
  sync_type: string;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  status: 'idle' | 'running' | 'failed' | 'paused';
  total_records: number;
  synced_records: number;
  failed_records: number;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface SyncHistory {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  synced_records: number;
  failed_records: number;
  duration_ms: number | null;
  error_message: string | null;
  error_details: Record<string, any> | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface SyncError {
  id: string;
  sync_history_id: string;
  sync_type: string;
  record_id: string | null;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  retry_count: number;
  resolved: boolean;
  resolved_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export class SyncStateManager {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 同期状態を取得
   */
  async getSyncState(syncType: string): Promise<SyncState | null> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .eq('sync_type', syncType)
      .single();

    if (error) {
      console.error(`Failed to get sync state for ${syncType}:`, error);
      return null;
    }

    return data;
  }

  /**
   * 同期開始
   */
  async startSync(syncType: string, totalRecords: number = 0): Promise<string | null> {
    try {
      // 同期状態を更新
      const { error: stateError } = await this.supabase
        .from('sync_state')
        .upsert({
          sync_type: syncType,
          status: 'running',
          last_sync_at: new Date().toISOString(),
          total_records: totalRecords,
          synced_records: 0,
          failed_records: 0,
          error_message: null
        });

      if (stateError) {
        console.error('Failed to update sync state:', stateError);
        return null;
      }

      // 同期履歴を作成
      const { data: historyData, error: historyError } = await this.supabase
        .from('sync_history')
        .insert({
          sync_type: syncType,
          started_at: new Date().toISOString(),
          status: 'running',
          total_records: totalRecords,
          synced_records: 0,
          failed_records: 0
        })
        .select()
        .single();

      if (historyError) {
        console.error('Failed to create sync history:', historyError);
        return null;
      }

      return historyData.id;
    } catch (error) {
      console.error('Error starting sync:', error);
      return null;
    }
  }

  /**
   * 同期進捗を更新
   */
  async updateProgress(
    syncType: string,
    historyId: string,
    syncedRecords: number,
    failedRecords: number
  ): Promise<void> {
    try {
      // 同期状態を更新
      await this.supabase
        .from('sync_state')
        .update({
          synced_records: syncedRecords,
          failed_records: failedRecords
        })
        .eq('sync_type', syncType);

      // 同期履歴を更新
      await this.supabase
        .from('sync_history')
        .update({
          synced_records: syncedRecords,
          failed_records: failedRecords
        })
        .eq('id', historyId);
    } catch (error) {
      console.error('Error updating sync progress:', error);
    }
  }

  /**
   * 同期完了
   */
  async completeSync(
    syncType: string,
    historyId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const completedAt = new Date().toISOString();
      const state = await this.getSyncState(syncType);
      
      if (!state) {
        console.error('Sync state not found');
        return;
      }

      // 同期履歴を取得して期間を計算
      const { data: history } = await this.supabase
        .from('sync_history')
        .select('started_at')
        .eq('id', historyId)
        .single();

      const durationMs = history
        ? new Date(completedAt).getTime() - new Date(history.started_at).getTime()
        : null;

      // 同期状態を更新
      await this.supabase
        .from('sync_state')
        .update({
          status: success ? 'idle' : 'failed',
          last_successful_sync_at: success ? completedAt : state.last_successful_sync_at,
          error_message: errorMessage || null
        })
        .eq('sync_type', syncType);

      // 同期履歴を更新
      await this.supabase
        .from('sync_history')
        .update({
          completed_at: completedAt,
          status: success ? 'completed' : 'failed',
          duration_ms: durationMs,
          error_message: errorMessage || null
        })
        .eq('id', historyId);
    } catch (error) {
      console.error('Error completing sync:', error);
    }
  }

  /**
   * エラーを記録
   */
  async logError(
    historyId: string,
    syncType: string,
    recordId: string | null,
    errorType: string,
    errorMessage: string,
    errorStack?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('sync_errors')
        .insert({
          sync_history_id: historyId,
          sync_type: syncType,
          record_id: recordId,
          error_type: errorType,
          error_message: errorMessage,
          error_stack: errorStack || null,
          retry_count: 0,
          resolved: false,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging sync error:', error);
    }
  }

  /**
   * 同期履歴を取得
   */
  async getSyncHistory(
    syncType: string,
    limit: number = 10
  ): Promise<SyncHistory[]> {
    const { data, error } = await this.supabase
      .from('sync_history')
      .select('*')
      .eq('sync_type', syncType)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * エラーログを取得
   */
  async getSyncErrors(
    historyId: string,
    limit: number = 50
  ): Promise<SyncError[]> {
    const { data, error } = await this.supabase
      .from('sync_errors')
      .select('*')
      .eq('sync_history_id', historyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get sync errors:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 未解決のエラーを取得
   */
  async getUnresolvedErrors(syncType: string): Promise<SyncError[]> {
    const { data, error } = await this.supabase
      .from('sync_errors')
      .select('*')
      .eq('sync_type', syncType)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get unresolved errors:', error);
      return [];
    }

    return data || [];
  }

  /**
   * エラーを解決済みにマーク
   */
  async markErrorResolved(errorId: string): Promise<void> {
    try {
      await this.supabase
        .from('sync_errors')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', errorId);
    } catch (error) {
      console.error('Error marking error as resolved:', error);
    }
  }

  /**
   * 同期が実行中かチェック
   */
  async isSyncRunning(syncType: string): Promise<boolean> {
    const state = await this.getSyncState(syncType);
    return state?.status === 'running';
  }

  /**
   * 同期を一時停止
   */
  async pauseSync(syncType: string): Promise<void> {
    try {
      await this.supabase
        .from('sync_state')
        .update({ status: 'paused' })
        .eq('sync_type', syncType);
    } catch (error) {
      console.error('Error pausing sync:', error);
    }
  }

  /**
   * 同期を再開
   */
  async resumeSync(syncType: string): Promise<void> {
    try {
      await this.supabase
        .from('sync_state')
        .update({ status: 'idle' })
        .eq('sync_type', syncType);
    } catch (error) {
      console.error('Error resuming sync:', error);
    }
  }
}
