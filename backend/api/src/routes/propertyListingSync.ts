import express from 'express';
import { PropertyListingRestSyncService } from '../services/PropertyListingRestSyncService';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize sync service
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration for sync service');
}

const syncService = supabaseUrl && supabaseKey
  ? new PropertyListingRestSyncService({
      supabaseUrl,
      supabaseKey,
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100'),
      rateLimit: parseInt(process.env.SYNC_RATE_LIMIT || '10'),
      retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.SYNC_RETRY_DELAY || '1000'),
      circuitBreakerThreshold: parseInt(process.env.SYNC_CIRCUIT_BREAKER_THRESHOLD || '5'),
      circuitBreakerTimeout: parseInt(process.env.SYNC_CIRCUIT_BREAKER_TIMEOUT || '60000')
    })
  : null;

/**
 * POST /api/property-listing-sync/manual
 * 
 * Trigger manual property listing sync
 * 
 * Request body:
 * - force: boolean (optional) - Force sync even if recent sync exists
 * - batchSize: number (optional) - Override default batch size
 * - propertyNumbers: string[] (optional) - Sync specific properties only
 * 
 * Response:
 * - syncId: string - Unique sync operation ID
 * - status: string - Current sync status
 * - startedAt: string - ISO timestamp when sync started
 */
router.post('/manual', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured',
        message: 'Missing Supabase configuration'
      });
    }

    const { force, batchSize, propertyNumbers } = req.body;

    console.log('📥 Manual sync request received:', {
      force,
      batchSize,
      propertyCount: propertyNumbers?.length || 'all'
    });

    let result;
    if (propertyNumbers && propertyNumbers.length > 0) {
      // Selective sync
      result = await syncService.syncByNumbers(propertyNumbers);
    } else {
      // Full sync
      result = await syncService.syncAll();
    }

    console.log('✅ Sync initiated:', {
      syncId: result.syncId,
      status: result.status
    });

    res.json({
      syncId: result.syncId,
      status: result.status,
      startedAt: result.startedAt,
      message: 'Sync operation started successfully'
    });
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * GET /api/property-listing-sync/status/:syncId
 * 
 * Get sync operation status
 * 
 * Response:
 * - syncId: string - Sync operation ID
 * - status: string - Current status (queued, in_progress, completed, failed, partial)
 * - startedAt: string - ISO timestamp when sync started
 * - completedAt: string (optional) - ISO timestamp when sync completed
 * - stats: object - Sync statistics
 *   - total: number - Total items to sync
 *   - success: number - Successfully synced items
 *   - failed: number - Failed items
 *   - skipped: number - Skipped items
 * - errors: array (optional) - List of errors if any
 */
router.get('/status/:syncId', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured'
      });
    }

    const { syncId } = req.params;

    const status = await syncService.getSyncStatus(syncId);

    res.json(status);
  } catch (error) {
    console.error('❌ Failed to get sync status:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * GET /api/property-listing-sync/health
 * 
 * Get sync health status
 * 
 * Response:
 * - status: string - Overall health (healthy, degraded, unhealthy)
 * - lastSync: string (optional) - ISO timestamp of last completed sync
 * - errorRate: number - Error rate (0-1)
 * - avgSyncDuration: number - Average sync duration in seconds
 * - queueSize: number - Current queue size
 * - circuitBreakerState: string - Circuit breaker state (closed, open, half-open)
 * - recentErrors: number - Number of errors in last hour
 */
router.get('/health', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured'
      });
    }

    const health = await syncService.getHealth();

    res.json(health);
  } catch (error) {
    console.error('❌ Failed to get health status:', error);
    res.status(500).json({
      error: 'Failed to get health status',
      message: error.message
    });
  }
});

/**
 * GET /api/property-listing-sync/history
 * 
 * Get recent sync history
 * 
 * Query parameters:
 * - limit: number (optional) - Maximum number of records to return (default: 10)
 * 
 * Response:
 * - syncs: array - List of recent sync operations
 */
router.get('/history', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured'
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const history = await syncService.getRecentSyncs(limit);

    res.json({
      syncs: history,
      count: history.length
    });
  } catch (error) {
    console.error('❌ Failed to get sync history:', error);
    res.status(500).json({
      error: 'Failed to get sync history',
      message: error.message
    });
  }
});

/**
 * GET /api/property-listing-sync/statistics
 * 
 * Get sync statistics for the last 24 hours
 * 
 * Response:
 * - errorRate: number - Error rate (0-1)
 * - avgDuration: number - Average sync duration in seconds
 * - totalSyncs: number - Total number of syncs
 * - successfulSyncs: number - Number of successful syncs
 * - failedSyncs: number - Number of failed syncs
 * - partialSyncs: number - Number of partial syncs
 */
router.get('/statistics', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured'
      });
    }

    const statistics = await syncService.getStatistics();

    res.json(statistics);
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/property-listing-sync/errors/:syncId
 * 
 * Get errors for a specific sync operation
 * 
 * Response:
 * - errors: array - List of errors
 *   - propertyNumber: string - Property number that failed
 *   - errorType: string - Error category
 *   - errorMessage: string - Error message
 *   - retryCount: number - Number of retries attempted
 *   - createdAt: string - ISO timestamp when error occurred
 */
router.get('/errors/:syncId', async (req, res) => {
  try {
    if (!syncService) {
      return res.status(500).json({
        error: 'Sync service not configured'
      });
    }

    const { syncId } = req.params;

    const errors = await syncService.getSyncErrors(syncId);

    res.json({
      syncId,
      errors,
      count: errors.length
    });
  } catch (error) {
    console.error('❌ Failed to get sync errors:', error);
    res.status(500).json({
      error: 'Failed to get sync errors',
      message: error.message
    });
  }
});

export default router;
