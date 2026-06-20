import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sync record stored in database
 */
export interface SyncRecord {
  id: string;
  sync_type: 'full' | 'selective' | 'manual' | 'scheduled';
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at?: string;
  total_items?: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  error_details?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Sync error record
 */
export interface SyncError {
  id: string;
  sync_id: string;
  property_number: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  retry_count: number;
  created_at: string;
}

/**
 * Sync statistics
 */
export interface SyncStatistics {
  errorRate: number;
  avgDuration: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  partialSyncs: number;
}

/**
 * Sync health status
 */
export interface SyncHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSync?: string;
  errorRate: number;
  avgSyncDuration: number;
  recentErrors: number;
}

/**
 * Service for managing property listing sync state
 * 
 * This service provides methods to:
 * - Create and track sync operations
 * - Update sync progress and status
 * - Record sync errors
 * - Calculate sync statistics
 * - Monitor sync health
 */
export class SyncStateService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new sync record
   * 
   * @param type - Type of sync operation
   * @param metadata - Optional metadata for the sync
   * @returns Sync ID
   */
  async createSync(
    type: 'full' | 'selective' | 'manual' | 'scheduled',
    metadata?: any
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .insert({
        sync_type: type,
        status: 'queued',
        started_at: new Date().toISOString(),
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync record: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update sync record
   * 
   * @param syncId - Sync ID to update
   * @param updates - Partial sync record updates
   */
  async updateSync(syncId: string, updates: Partial<SyncRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('property_listing_sync_state')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);

    if (error) {
      throw new Error(`Failed to update sync record: ${error.message}`);
    }
  }

  /**
   * Mark sync as started
   * 
   * @param syncId - Sync ID
   * @param totalItems - Total number of items to sync
   */
  async startSync(syncId: string, totalItems: number): Promise<void> {
    await this.updateSync(syncId, {
      status: 'in_progress',
      total_items: totalItems,
      started_at: new Date().toISOString()
    });
  }

  /**
   * Mark sync as completed
   * 
   * @param syncId - Sync ID
   * @param stats - Sync statistics
   */
  async completeSync(
    syncId: string,
    stats: {
      success: number;
      failed: number;
      skipped: number;
    }
  ): Promise<void> {
    const status = stats.failed === 0 ? 'completed' : 'partial';

    await this.updateSync(syncId, {
      status,
      success_count: stats.success,
      failed_count: stats.failed,
      skipped_count: stats.skipped,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark sync as failed
   * 
   * @param syncId - Sync ID
   * @param error - Error details
   */
  async failSync(syncId: string, error: Error): Promise<void> {
    await this.updateSync(syncId, {
      status: 'failed',
      error_details: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Record a sync error
   * 
   * @param syncId - Sync ID
   * @param propertyNumber - Property number that failed
   * @param error - Error details
   * @param retryCount - Number of retries attempted
   */
  async recordError(
    syncId: string,
    propertyNumber: string,
    error: Error,
    retryCount: number = 0
  ): Promise<void> {
    const { error: insertError } = await this.supabase
      .from('property_listing_sync_errors')
      .insert({
        sync_id: syncId,
        property_number: propertyNumber,
        error_type: this.categorizeError(error),
        error_message: error.message,
        error_stack: error.stack,
        retry_count: retryCount
      });

    if (insertError) {
      console.error('Failed to record sync error:', insertError.message);
    }
  }

  /**
   * Get sync record by ID
   * 
   * @param syncId - Sync ID
   * @returns Sync record
   */
  async getSync(syncId: string): Promise<SyncRecord> {
    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .select('*')
      .eq('id', syncId)
      .single();

    if (error) {
      throw new Error(`Failed to get sync record: ${error.message}`);
    }

    return data;
  }

  /**
   * Get last sync record
   * 
   * @returns Last sync record or null
   */
  async getLastSync(): Promise<SyncRecord | null> {
    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get last sync: ${error.message}`);
    }

    return data;
  }

  /**
   * Get sync errors for a sync operation
   * 
   * @param syncId - Sync ID
   * @returns Array of sync errors
   */
  async getSyncErrors(syncId: string): Promise<SyncError[]> {
    const { data, error } = await this.supabase
      .from('property_listing_sync_errors')
      .select('*')
      .eq('sync_id', syncId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get sync errors: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get sync statistics for the last 24 hours
   * 
   * @returns Sync statistics
   */
  async getStatistics(): Promise<SyncStatistics> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .select('*')
      .gte('started_at', oneDayAgo);

    if (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }

    const total = data.length;
    const successful = data.filter(s => s.status === 'completed').length;
    const failed = data.filter(s => s.status === 'failed').length;
    const partial = data.filter(s => s.status === 'partial').length;

    const durations = data
      .filter(s => s.completed_at)
      .map(s => {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.completed_at!).getTime();
        return (end - start) / 1000; // Convert to seconds
      });

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      errorRate: total > 0 ? failed / total : 0,
      avgDuration,
      totalSyncs: total,
      successfulSyncs: successful,
      failedSyncs: failed,
      partialSyncs: partial
    };
  }

  /**
   * Get sync health status
   * 
   * @returns Sync health status
   */
  async getHealth(): Promise<SyncHealth> {
    const stats = await this.getStatistics();
    const lastSync = await this.getLastSync();

    // Count recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentErrors } = await this.supabase
      .from('property_listing_sync_errors')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    const recentErrorCount = recentErrors?.length || 0;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (stats.errorRate > 0.1 || recentErrorCount > 50) {
      status = 'unhealthy';
    } else if (stats.errorRate > 0.05 || recentErrorCount > 20) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      lastSync: lastSync?.completed_at,
      errorRate: stats.errorRate,
      avgSyncDuration: stats.avgDuration,
      recentErrors: recentErrorCount
    };
  }

  /**
   * Get recent sync history
   * 
   * @param limit - Maximum number of records to return
   * @returns Array of sync records
   */
  async getRecentSyncs(limit: number = 10): Promise<SyncRecord[]> {
    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent syncs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Clean up old sync records
   * 
   * @param daysToKeep - Number of days of history to keep
   * @returns Number of records deleted
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('property_listing_sync_state')
      .delete()
      .lt('started_at', cutoffDate)
      .select();

    if (error) {
      throw new Error(`Failed to cleanup old records: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Categorize error type
   * 
   * @param error - Error object
   * @returns Error category
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    } else if (message.includes('network') || message.includes('timeout') || message.includes('enotfound')) {
      return 'network';
    } else if (message.includes('database') || message.includes('sql')) {
      return 'database';
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    } else {
      return 'unknown';
    }
  }
}
