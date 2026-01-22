import api from './api';

/**
 * Sync status response
 */
export interface SyncStatus {
  syncId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  stats?: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{
    propertyNumber: string;
    errorType: string;
    errorMessage: string;
    retryCount: number;
    createdAt: string;
  }>;
}

/**
 * Sync health response
 */
export interface SyncHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSync?: string;
  errorRate: number;
  avgSyncDuration: number;
  queueSize?: number;
  circuitBreakerState?: string;
  recentErrors: number;
}

/**
 * Sync statistics response
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
 * Sync record
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
}

/**
 * Sync error
 */
export interface SyncError {
  id: string;
  sync_id: string;
  property_number: string;
  error_type: string;
  error_message: string;
  retry_count: number;
  created_at: string;
}

/**
 * Trigger manual sync
 */
export async function triggerManualSync(options?: {
  force?: boolean;
  batchSize?: number;
  propertyNumbers?: string[];
}): Promise<{ syncId: string; status: string; startedAt: string }> {
  const response = await api.post('/property-listing-sync/manual', options || {});
  return response.data;
}

/**
 * Get sync status by ID
 */
export async function getSyncStatus(syncId: string): Promise<SyncStatus> {
  const response = await api.get(`/property-listing-sync/status/${syncId}`);
  return response.data;
}

/**
 * Get sync health
 */
export async function getSyncHealth(): Promise<SyncHealth> {
  const response = await api.get('/property-listing-sync/health');
  return response.data;
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 10): Promise<{ syncs: SyncRecord[]; count: number }> {
  const response = await api.get('/property-listing-sync/history', {
    params: { limit }
  });
  return response.data;
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(): Promise<SyncStatistics> {
  const response = await api.get('/property-listing-sync/statistics');
  return response.data;
}

/**
 * Get sync errors
 */
export async function getSyncErrors(syncId: string): Promise<{ syncId: string; errors: SyncError[]; count: number }> {
  const response = await api.get(`/property-listing-sync/errors/${syncId}`);
  return response.data;
}
