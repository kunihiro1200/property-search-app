import express, { Request, Response } from 'express';
import { sheetsRateLimiter } from '../services/RateLimiter';
import { createClient } from '@supabase/supabase-js';
import { SyncLogger } from '../services/SyncLogger';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { SpreadsheetSyncService } from '../services/SpreadsheetSyncService';
import { ManualSyncService, SyncMode } from '../services/ManualSyncService';
import { RollbackService } from '../services/RollbackService';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets設定（サービスアカウント認証を使用）
const sheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
};

// ManualSyncServiceのインスタンス（シングルトン）
let manualSyncService: ManualSyncService | null = null;

async function getManualSyncService(): Promise<ManualSyncService> {
  if (!manualSyncService) {
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    const logger = new SyncLogger(supabase);
    manualSyncService = new ManualSyncService(syncService, logger, supabase);
  }
  return manualSyncService;
}

// RollbackServiceのインスタンス（シングルトン）
let rollbackService: RollbackService | null = null;

function getRollbackService(): RollbackService {
  if (!rollbackService) {
    const logger = new SyncLogger(supabase);
    rollbackService = new RollbackService(supabase, logger);
  }
  return rollbackService;
}

/**
 * GET /api/sync/rate-limit
 * レート制限の使用状況を取得
 */
router.get('/rate-limit', async (req: Request, res: Response) => {
  try {
    const usage = sheetsRateLimiter.getUsage();
    const isNearLimit = sheetsRateLimiter.isNearLimit(0.8);

    res.json({
      success: true,
      data: {
        ...usage,
        isNearLimit,
        warning: isNearLimit ? 'Rate limit is approaching 80% usage' : null,
      },
    });
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/freshness
 * キャッシュの鮮度ステータスを取得
 */
router.get('/freshness', async (req: Request, res: Response) => {
  try {
    const { cacheManager } = await import('../services/CacheManager');
    const cacheKey = 'sellers:list:all';
    const thresholdMinutes = parseInt(req.query.threshold as string) || 5;
    
    const freshnessStatus = await cacheManager.checkFreshness(cacheKey, thresholdMinutes);
    
    res.json({
      success: true,
      data: freshnessStatus,
    });
  } catch (error: any) {
    console.error('Freshness check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/status
 * 同期ステータスを取得（強化版）
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { getSyncHealthChecker } = await import('../services/SyncHealthChecker');
    const { getEnhancedPeriodicSyncManager, isAutoSyncEnabled } = await import('../services/EnhancedAutoSyncService');
    const logger = new SyncLogger(supabase);

    // ヘルスステータスを取得
    const healthChecker = getSyncHealthChecker();
    const health = await healthChecker.getHealthStatus();

    // 定期同期マネージャーの状態を取得
    const periodicManager = getEnhancedPeriodicSyncManager();

    // 最新の同期ログを取得
    const recentLogs = await logger.getSyncHistory(10);

    // 統計情報を取得
    const stats = await logger.getSyncStats(7);

    // レート制限情報を取得
    const rateLimitUsage = sheetsRateLimiter.getUsage();

    res.json({
      success: true,
      data: {
        health,
        isRunning: periodicManager.isActive(),
        config: {
          enabled: isAutoSyncEnabled(),
          intervalMinutes: periodicManager.getIntervalMinutes(),
        },
        recentLogs,
        stats,
        rateLimitUsage,
      },
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/history
 * 同期履歴を取得（強化版）
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { getSyncLogService } = await import('../services/SyncLogService');
    const syncLogService = getSyncLogService();
    const limit = parseInt(req.query.limit as string) || 100;

    // 強化版ログサービスから履歴を取得
    const entries = await syncLogService.getHistory(limit);

    res.json({
      success: true,
      data: {
        entries,
        total: entries.length,
      },
    });
  } catch (error: any) {
    console.error('Sync history error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/errors
 * エラーログを取得
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const logger = new SyncLogger(supabase);
    const limit = parseInt(req.query.limit as string) || 100;
    const errorType = req.query.errorType as any;

    const errors = await logger.getErrorLogs(limit, {
      errorType,
    });

    res.json({
      success: true,
      data: errors,
    });
  } catch (error: any) {
    console.error('Error logs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/rate-limit/reset
 * レート制限をリセット（管理者用）
 */
router.post('/rate-limit/reset', async (req: Request, res: Response) => {
  try {
    sheetsRateLimiter.reset();

    res.json({
      success: true,
      message: 'Rate limiter reset successfully',
    });
  } catch (error: any) {
    console.error('Rate limit reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/manual
 * 手動同期を実行（スプレッドシート → データベース）
 */
router.post('/manual', async (req: Request, res: Response) => {
  const { ErrorHandler } = await import('../services/ErrorHandler');
  const errorHandler = new ErrorHandler(supabase);
  
  try {
    const { cacheManager } = await import('../services/CacheManager');
    
    // キャッシュから現在のデータを取得
    const cacheKey = 'sellers:list:all';
    const cachedData = await cacheManager.get(cacheKey);
    
    // スプレッドシートから最新データを取得（リトライ機能付き）
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    
    const latestData = await errorHandler.withRetry(
      () => syncService.fetchLatestData(),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      },
      { operation: 'fetchLatestData', endpoint: '/api/sync/manual' }
    );
    
    // 差分を計算
    const diff = await syncService.compareWithCache(
      cachedData?.data || []
    );
    
    // 差分を適用（リトライ機能付き）
    const result = await errorHandler.withRetry(
      () => syncService.applyChanges(diff),
      {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 2000,
        backoffMultiplier: 2,
      },
      { operation: 'applyChanges', recordCount: diff.added.length + diff.updated.length }
    );
    
    // キャッシュを更新
    await cacheManager.set(cacheKey, latestData, 300); // 5分
    
    res.json({
      success: result.success,
      message: 'Manual sync completed',
      data: {
        recordsAdded: result.recordsAdded,
        recordsUpdated: result.recordsUpdated,
        recordsDeleted: result.recordsDeleted,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    // エラーをログに記録
    await errorHandler.logError(error, {
      operation: 'manualSync',
      endpoint: '/api/sync/manual',
    });
    
    // ユーザーフレンドリーなエラーメッセージを返す
    const userMessage = errorHandler.getUserFriendlyMessage(error);
    const isRecoverable = errorHandler.isRecoverable(error);
    
    res.status(500).json({
      success: false,
      error: userMessage,
      details: error.message,
      recoverable: isRecoverable,
    });
  }
});

/**
 * POST /api/sync/manual/legacy
 * 手動同期を実行（旧バージョン - データベース → スプレッドシート）
 */
router.post('/manual/legacy', async (req: Request, res: Response) => {
  try {
    const mode: SyncMode = req.body.mode || 'incremental';

    if (mode !== 'full' && mode !== 'incremental') {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "full" or "incremental"',
      });
    }

    const service = await getManualSyncService();

    // 既に実行中かチェック
    if (service.isRunningSync()) {
      return res.status(409).json({
        success: false,
        error: 'Sync is already running',
        progress: service.getCurrentProgress(),
      });
    }

    // 非同期で同期を実行
    service.executeManualSync(mode).catch(error => {
      console.error('Manual sync error:', error);
    });

    res.json({
      success: true,
      message: 'Manual sync started',
      mode,
    });
  } catch (error: any) {
    console.error('Manual sync start error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/manual/progress
 * 手動同期の進行状況を取得
 */
router.get('/manual/progress', async (req: Request, res: Response) => {
  try {
    const service = await getManualSyncService();
    const progress = service.getCurrentProgress();
    const isRunning = service.isRunningSync();

    res.json({
      success: true,
      data: {
        isRunning,
        progress,
      },
    });
  } catch (error: any) {
    console.error('Manual sync progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/snapshot
 * スナップショットを作成
 */
router.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const service = getRollbackService();

    const snapshot = await service.createSnapshot(description);

    res.json({
      success: true,
      message: 'Snapshot created successfully',
      data: snapshot,
    });
  } catch (error: any) {
    console.error('Snapshot creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/snapshots
 * スナップショット一覧を取得
 */
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const service = getRollbackService();

    const snapshots = await service.listSnapshots(limit);

    res.json({
      success: true,
      data: snapshots,
    });
  } catch (error: any) {
    console.error('Snapshots retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/rollback
 * スナップショットからロールバック
 */
router.post('/rollback', async (req: Request, res: Response) => {
  try {
    const { snapshotId } = req.body;

    if (!snapshotId) {
      return res.status(400).json({
        success: false,
        error: 'snapshotId is required',
      });
    }

    const service = getRollbackService();
    const result = await service.rollback(snapshotId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Rollback completed successfully',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        data: result,
      });
    }
  } catch (error: any) {
    console.error('Rollback error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/sync/snapshot/:id
 * スナップショットを削除
 */
router.delete('/snapshot/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = getRollbackService();

    const success = await service.deleteSnapshot(id);

    if (success) {
      res.json({
        success: true,
        message: 'Snapshot deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete snapshot',
      });
    }
  } catch (error: any) {
    console.error('Snapshot deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/auto
 * スプレッドシートから新規売主を自動同期（1回のみ実行）- 旧バージョン
 */
router.post('/auto', async (req: Request, res: Response) => {
  try {
    const { getAutoSyncService } = await import('../services/AutoSyncService');
    const autoSyncService = getAutoSyncService();
    
    await autoSyncService.initialize();
    const result = await autoSyncService.syncNewSellers();

    res.json({
      success: result.success,
      message: result.success 
        ? `Auto-sync completed: ${result.newSellersCount} new sellers synced`
        : 'Auto-sync completed with errors',
      data: result,
    });
  } catch (error: any) {
    console.error('Auto-sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/trigger
 * 手動で強化版フル同期をトリガー（全件比較方式）
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { getEnhancedAutoSyncService } = await import('../services/EnhancedAutoSyncService');
    const { getSyncHealthChecker } = await import('../services/SyncHealthChecker');
    
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    
    const result = await syncService.runFullSync('manual');
    
    // ヘルスチェックを更新
    const healthChecker = getSyncHealthChecker();
    await healthChecker.checkAndUpdateHealth();

    const isSuccess = result.status === 'success' || result.status === 'partial_success';

    res.json({
      success: isSuccess,
      message: isSuccess 
        ? `Full sync completed: ${result.additionResult.successfullyAdded} added, ${result.deletionResult.successfullyDeleted} deleted`
        : 'Full sync failed',
      data: {
        status: result.status,
        additionResult: {
          totalProcessed: result.additionResult.totalProcessed,
          successfullyAdded: result.additionResult.successfullyAdded,
          successfullyUpdated: result.additionResult.successfullyUpdated,
          failed: result.additionResult.failed,
        },
        deletionResult: {
          totalDetected: result.deletionResult.totalDetected,
          successfullyDeleted: result.deletionResult.successfullyDeleted,
          failedToDelete: result.deletionResult.failedToDelete,
          requiresManualReview: result.deletionResult.requiresManualReview,
        },
        duration: result.totalDurationMs,
        syncedAt: result.syncedAt,
      },
    });
  } catch (error: any) {
    console.error('Trigger sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/missing
 * 不足している売主を検出（同期はしない）
 */
router.get('/missing', async (req: Request, res: Response) => {
  try {
    const { getEnhancedAutoSyncService } = await import('../services/EnhancedAutoSyncService');
    
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    
    const missingSellers = await syncService.detectMissingSellers();

    res.json({
      success: true,
      data: {
        count: missingSellers.length,
        sellerNumbers: missingSellers.slice(0, 100), // 最初の100件のみ
        hasMore: missingSellers.length > 100,
      },
    });
  } catch (error: any) {
    console.error('Detect missing sellers error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/periodic/start
 * 定期同期を開始
 */
router.post('/periodic/start', async (req: Request, res: Response) => {
  try {
    const { getPeriodicSyncManager } = await import('../services/AutoSyncService');
    const intervalMinutes = req.body.intervalMinutes || 5;
    const periodicSyncManager = getPeriodicSyncManager(intervalMinutes);
    
    if (periodicSyncManager.isActive()) {
      return res.json({
        success: true,
        message: 'Periodic sync is already running',
        data: {
          isActive: true,
          intervalMinutes: periodicSyncManager.getIntervalMinutes(),
        },
      });
    }

    await periodicSyncManager.start();

    res.json({
      success: true,
      message: `Periodic sync started (every ${periodicSyncManager.getIntervalMinutes()} minutes)`,
      data: {
        isActive: true,
        intervalMinutes: periodicSyncManager.getIntervalMinutes(),
      },
    });
  } catch (error: any) {
    console.error('Periodic sync start error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/periodic/stop
 * 定期同期を停止
 */
router.post('/periodic/stop', async (req: Request, res: Response) => {
  try {
    const { getPeriodicSyncManager } = await import('../services/AutoSyncService');
    const periodicSyncManager = getPeriodicSyncManager();
    
    periodicSyncManager.stop();

    res.json({
      success: true,
      message: 'Periodic sync stopped',
      data: {
        isActive: false,
      },
    });
  } catch (error: any) {
    console.error('Periodic sync stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/periodic/status
 * 定期同期のステータスを取得
 */
router.get('/periodic/status', async (req: Request, res: Response) => {
  try {
    const { getPeriodicSyncManager } = await import('../services/AutoSyncService');
    const periodicSyncManager = getPeriodicSyncManager();

    res.json({
      success: true,
      data: {
        isActive: periodicSyncManager.isActive(),
        intervalMinutes: periodicSyncManager.getIntervalMinutes(),
      },
    });
  } catch (error: any) {
    console.error('Periodic sync status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
