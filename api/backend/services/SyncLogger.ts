import { SupabaseClient } from '@supabase/supabase-js';

export type SyncType = 'migration' | 'create' | 'update' | 'delete' | 'manual' | 'batch';
export type SyncStatus = 'success' | 'failure' | 'pending';
export type ErrorType = 'network' | 'validation' | 'rate_limit' | 'auth' | 'conflict' | 'unknown';

export interface SyncLog {
  id?: string;
  sync_type: SyncType;
  seller_id?: string;
  status: SyncStatus;
  error_message?: string;
  rows_affected: number;
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  metadata?: any;
}

export interface ErrorLog {
  id?: string;
  error_type: ErrorType;
  error_message: string;
  stack_trace?: string;
  seller_id?: string;
  operation?: string;
  retry_count: number;
  metadata?: any;
}

/**
 * 同期ロガー
 * 
 * スプレッドシート同期操作のログとエラーを記録します。
 */
export class SyncLogger {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 同期ログを開始
   */
  async startSyncLog(
    syncType: SyncType,
    sellerId?: string,
    metadata?: any
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('sync_logs')
      .insert({
        sync_type: syncType,
        seller_id: sellerId,
        status: 'pending',
        rows_affected: 0,
        started_at: new Date().toISOString(),
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create sync log:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * 同期ログを完了
   */
  async completeSyncLog(
    logId: string,
    status: 'success' | 'failure',
    rowsAffected: number,
    errorMessage?: string
  ): Promise<void> {
    const startedAt = await this.getSyncLogStartTime(logId);
    const completedAt = new Date();
    const durationMs = startedAt ? completedAt.getTime() - startedAt.getTime() : 0;

    const { error } = await this.supabase
      .from('sync_logs')
      .update({
        status,
        rows_affected: rowsAffected,
        error_message: errorMessage,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
      })
      .eq('id', logId);

    if (error) {
      console.error('Failed to update sync log:', error);
    }
  }

  /**
   * 同期ログの開始時刻を取得
   */
  private async getSyncLogStartTime(logId: string): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('sync_logs')
      .select('started_at')
      .eq('id', logId)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.started_at);
  }

  /**
   * エラーログを記録
   */
  async logError(
    errorType: ErrorType,
    errorMessage: string,
    options?: {
      stackTrace?: string;
      sellerId?: string;
      operation?: string;
      retryCount?: number;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('error_logs')
        .insert({
          error_type: errorType,
          error_message: errorMessage,
          stack_trace: options?.stackTrace,
          seller_id: options?.sellerId,
          operation: options?.operation,
          retry_count: options?.retryCount ?? 0,
          metadata: options?.metadata,
        });

      if (error) {
        // error_logsテーブルが存在しない場合は、コンソールにのみ出力
        if (error.code === 'PGRST205') {
          // テーブルが存在しない - 無視
          return;
        }
        console.error('Failed to log error:', error);
      }
    } catch (err) {
      // ログ記録の失敗は無視（メイン処理に影響を与えない）
    }
  }

  /**
   * エラータイプを判定
   */
  static determineErrorType(error: any): ErrorType {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('econnrefused') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'rate_limit';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'auth';
    }
    if (message.includes('conflict') || message.includes('duplicate')) {
      return 'conflict';
    }

    return 'unknown';
  }

  /**
   * 同期履歴を取得
   */
  async getSyncHistory(
    limit: number = 100,
    filters?: {
      syncType?: SyncType;
      status?: SyncStatus;
      sellerId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SyncLog[]> {
    let query = this.supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (filters?.syncType) {
      query = query.eq('sync_type', filters.syncType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }
    if (filters?.startDate) {
      query = query.gte('started_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('started_at', filters.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch sync history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * エラーログを取得
   */
  async getErrorLogs(
    limit: number = 100,
    filters?: {
      errorType?: ErrorType;
      sellerId?: string;
      operation?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ErrorLog[]> {
    let query = this.supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.errorType) {
      query = query.eq('error_type', filters.errorType);
    }
    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }
    if (filters?.operation) {
      query = query.eq('operation', filters.operation);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch error logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 同期統計を取得
   */
  async getSyncStats(days: number = 7): Promise<{
    totalSyncs: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
    errorsByType: Record<ErrorType, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 同期ログの統計
    const { data: syncLogs } = await this.supabase
      .from('sync_logs')
      .select('status, duration_ms')
      .gte('started_at', startDate.toISOString());

    const totalSyncs = syncLogs?.length || 0;
    const successCount = syncLogs?.filter(log => log.status === 'success').length || 0;
    const failureCount = syncLogs?.filter(log => log.status === 'failure').length || 0;
    const durations = syncLogs?.filter(log => log.duration_ms).map(log => log.duration_ms) || [];
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // エラーログの統計
    const { data: errorLogs } = await this.supabase
      .from('error_logs')
      .select('error_type')
      .gte('created_at', startDate.toISOString());

    const errorsByType: Record<ErrorType, number> = {
      network: 0,
      validation: 0,
      rate_limit: 0,
      auth: 0,
      conflict: 0,
      unknown: 0,
    };

    errorLogs?.forEach(log => {
      errorsByType[log.error_type as ErrorType]++;
    });

    return {
      totalSyncs,
      successCount,
      failureCount,
      averageDuration,
      errorsByType,
    };
  }
}
