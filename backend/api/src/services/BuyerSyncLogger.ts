import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SyncError {
  row: number;
  buyerNumber: string | null;
  message: string;
  timestamp: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: SyncError[];
  duration: number;
  totalProcessed: number;
  successRate: number;
}

export interface SyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  total_buyers: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  skipped_count: number;
  success_rate: number;
  duration_ms: number;
  errors: SyncError[];
  created_at: string;
}

/**
 * Service for logging buyer sync operations
 */
export class BuyerSyncLogger {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Log the start of a sync operation
   * @param totalBuyers Total number of buyers to sync
   * @returns The sync log ID
   */
  async logSyncStart(totalBuyers: number): Promise<string> {
    const { data, error } = await this.supabase
      .from('buyer_sync_logs')
      .insert({
        sync_started_at: new Date().toISOString(),
        total_buyers: totalBuyers,
        created_count: 0,
        updated_count: 0,
        failed_count: 0,
        skipped_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log sync start:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Log the completion of a sync operation
   * @param syncId The sync log ID
   * @param result The sync result
   */
  async logSyncComplete(syncId: string, result: SyncResult): Promise<void> {
    const { error } = await this.supabase
      .from('buyer_sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        created_count: result.created,
        updated_count: result.updated,
        failed_count: result.failed,
        skipped_count: result.skipped,
        success_rate: result.successRate,
        duration_ms: result.duration,
        errors: result.errors,
      })
      .eq('id', syncId);

    if (error) {
      console.error('Failed to log sync complete:', error);
      throw error;
    }
  }

  /**
   * Get recent sync logs
   * @param limit Number of logs to retrieve
   * @returns Array of sync logs
   */
  async getRecentSyncs(limit: number = 10): Promise<SyncLog[]> {
    const { data, error } = await this.supabase
      .from('buyer_sync_logs')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get recent syncs:', error);
      throw error;
    }

    return data as SyncLog[];
  }

  /**
   * Get a specific sync log by ID
   * @param syncId The sync log ID
   * @returns The sync log or null if not found
   */
  async getSyncById(syncId: string): Promise<SyncLog | null> {
    const { data, error } = await this.supabase
      .from('buyer_sync_logs')
      .select('*')
      .eq('id', syncId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get sync by ID:', error);
      throw error;
    }

    return data as SyncLog;
  }
}
