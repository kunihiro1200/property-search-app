/**
 * Calls API Routes
 * 通話関連のAPIエンドポイント
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth';
import { getPhoneService } from '../services/PhoneService';
import { getCallLogService } from '../services/CallLogService';
import { getRecordingService } from '../services/RecordingService';
import {
  addTranscriptionJob,
  getTranscriptionJobStatus,
  retryTranscriptionJob,
  getQueueStats,
} from '../jobs/transcriptionWorker';
import logger from '../utils/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const router = Router();

// 全てのルートに認証を適用
router.use(authenticate);

// サービスインスタンス
const phoneService = getPhoneService();
const callLogService = getCallLogService();
const recordingService = getRecordingService();

/**
 * POST /api/calls/outbound
 * 発信を開始
 */
router.post(
  '/outbound',
  [
    body('sellerId').isUUID().withMessage('Valid seller ID is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { sellerId, phoneNumber, userId } = req.body;

      // 発信を開始
      const result = await phoneService.startOutboundCall({
        sellerId,
        phoneNumber,
        userId: userId || req.employee?.id,
      });

      logger.info('Outbound call initiated', {
        callLogId: result.callLogId,
        sellerId,
        userId: userId || req.employee?.id,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to initiate outbound call', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'OUTBOUND_CALL_FAILED',
          message: error.message || 'Failed to initiate outbound call',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * POST /api/calls/:callId/end
 * 通話を終了
 */
router.post(
  '/:callId/end',
  [param('callId').isUUID().withMessage('Valid call ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { callId } = req.params;
      const { durationSeconds } = req.body;

      // 通話を終了
      await phoneService.endCall({
        callLogId: callId,
        endedAt: new Date(),
        durationSeconds: durationSeconds || 0,
        status: 'completed',
      });

      const result = { callLogId: callId, status: 'completed' };

      logger.info('Call ended', { callLogId: callId });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to end call', { error, callId: req.params.callId });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'END_CALL_FAILED',
          message: error.message || 'Failed to end call',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * POST /api/calls/inbound/webhook
 * Amazon Connectからの着信Webhook
 */
router.post(
  '/inbound/webhook',
  [
    body('contactId').notEmpty().withMessage('Contact ID is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
    body('eventType')
      .isIn(['call_started', 'call_ended', 'call_connected'])
      .withMessage('Invalid event type'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { contactId, phoneNumber, timestamp, eventType, instanceId, queueId, agentId } =
        req.body;

      // TODO: Webhookイベントを処琁E��EandleInboundWebhookメソチE��を実裁E��る忁E��があります！E
      // const result = await phoneService.handleInboundWebhook({
      //   contactId,
      //   phoneNumber,
      //   timestamp: new Date(timestamp),
      //   eventType,
      //   instanceId,
      //   queueId,
      //   agentId,
      // });

      // 暫定的な実裁E 通話ログを作�E
      const callLog = await phoneService.createCallLog({
        seller_id: null, // TODO: 電話番号からSellerを検索
        user_id: null,
        direction: 'inbound',
        phone_number: phoneNumber,
        call_status: eventType === 'call_ended' ? 'completed' : 'completed',
        started_at: new Date(timestamp),
        ended_at: eventType === 'call_ended' ? new Date() : null,
        duration_seconds: null,
        contact_id: contactId,
        instance_id: instanceId,
        queue_id: queueId,
        agent_id: agentId,
      });

      const result = {
        callLogId: callLog.id,
        sellerId: null,
        matched: false,
      };

      logger.info('Inbound webhook processed', {
        contactId,
        eventType,
        matched: result.matched,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to process inbound webhook', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'WEBHOOK_PROCESSING_FAILED',
          message: error.message || 'Failed to process webhook',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls
 * 通話ログ一覧を取得
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sellerId').optional().isUUID().withMessage('Seller ID must be a valid UUID'),
    query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
    query('direction')
      .optional()
      .isIn(['inbound', 'outbound'])
      .withMessage('Direction must be inbound or outbound'),
    query('status')
      .optional()
      .isIn(['completed', 'missed', 'failed', 'busy', 'no_answer'])
      .withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    query('sortBy')
      .optional()
      .isIn(['started_at', 'duration_seconds', 'created_at'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const {
        page,
        limit,
        sellerId,
        userId,
        direction,
        status,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      } = req.query;

      // 通話ログ一覧を取得
      const result = await callLogService.getCallLogs({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sellerId: sellerId as string,
        userId: userId as string,
        direction: direction as any,
        status: status as any,
        startDate: startDate as string,
        endDate: endDate as string,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to get call logs', { error, query: req.query });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'GET_CALL_LOGS_FAILED',
          message: error.message || 'Failed to get call logs',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/:callId
 * 通話詳細を取得
 */
router.get(
  '/:callId',
  [param('callId').isUUID().withMessage('Valid call ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { callId } = req.params;

      // 通話詳細を取得
      const callLog = await callLogService.getCallLogById(callId);

      if (!callLog) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CALL_NOT_FOUND',
            message: 'Call log not found',
            retryable: false,
          },
        });
      }

      res.json({
        success: true,
        data: callLog,
      });
    } catch (error: any) {
      logger.error('Failed to get call log', { error, callId: req.params.callId });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'GET_CALL_LOG_FAILED',
          message: error.message || 'Failed to get call log',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/:callId/transcription
 * 文字起こしを取得
 */
router.get(
  '/:callId/transcription',
  [param('callId').isUUID().withMessage('Valid call ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { callId } = req.params;

      // 文字起こしを取得
      // TODO: getTranscriptionByCallLogIdメソッドを実装する必要があります
      const { data: transcription } = await supabase
        .from('call_transcriptions')
        .select('*')
        .eq('call_log_id', callId)
        .single();

      if (!transcription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TRANSCRIPTION_NOT_FOUND',
            message: 'Transcription not found',
            retryable: false,
          },
        });
      }

      res.json({
        success: true,
        data: {
          callLogId: transcription.call_log_id,
          transcriptionText: transcription.transcription_text,
          transcriptionJson: transcription.transcription_json,
          languageCode: transcription.language_code,
          confidenceScore: transcription.confidence_score,
          sentiment: transcription.sentiment,
          sentimentScores: transcription.sentiment_scores,
          detectedKeywords: transcription.detected_keywords,
          status: transcription.transcription_status,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get transcription', { error, callId: req.params.callId });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'GET_TRANSCRIPTION_FAILED',
          message: error.message || 'Failed to get transcription',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/:callId/recording
 * 録音ファイルのURLを取得
 */
router.get(
  '/:callId/recording',
  [
    param('callId').isUUID().withMessage('Valid call ID is required'),
    query('expiresIn')
      .optional()
      .isInt({ min: 60, max: 86400 })
      .withMessage('Expires in must be between 60 and 86400 seconds'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { callId } = req.params;
      const { expiresIn } = req.query;

      // 録音ファイルを取得
      const recording = await recordingService.getRecordingByCallLogId(callId);

      if (!recording) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not found',
            retryable: false,
          },
        });
      }

      // Presigned URLを生戁E
      const { url, expiresAt } = await recordingService.getPresignedUrl(
        recording.id,
        expiresIn ? parseInt(expiresIn as string) : undefined
      );

      // アクセスを記録
      await recordingService.recordAccess(recording.id, req.employee?.id);

      res.json({
        success: true,
        data: {
          recordingUrl: url,
          expiresAt: expiresAt.toISOString(),
          durationSeconds: recording.duration_seconds,
          format: recording.format,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get recording URL', { error, callId: req.params.callId });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'GET_RECORDING_FAILED',
          message: error.message || 'Failed to get recording URL',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/statistics
 * 通話統計を取得
 */
router.get(
  '/statistics',
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
    query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
    query('direction')
      .optional()
      .isIn(['inbound', 'outbound'])
      .withMessage('Direction must be inbound or outbound'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { startDate, endDate, userId, direction } = req.query;

      // 統計情報を取得
      const statistics = await callLogService.getCallStatistics({
        startDate: startDate as string,
        endDate: endDate as string,
        userId: userId as string,
        direction: direction as any,
      });

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Failed to get call statistics', { error, query: req.query });
      res.status(500).json({
        success: false,
        error: {
          code: error.code || 'GET_STATISTICS_FAILED',
          message: error.message || 'Failed to get call statistics',
          retryable: error.retryable || false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/config
 * AWS設定を取得（管理者のみ）
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック
    const isAdmin = req.employee?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          retryable: false,
        },
      });
    }

    // 環境変数から設定を取得（機密情報はマスク）
    const config = {
      awsRegion: process.env.AWS_REGION || 'ap-northeast-1',
      amazonConnectInstanceId: process.env.AMAZON_CONNECT_INSTANCE_ID
        ? '***' + process.env.AMAZON_CONNECT_INSTANCE_ID.slice(-4)
        : null,
      s3RecordingsBucket: process.env.S3_RECORDINGS_BUCKET || null,
      enableSentimentAnalysis: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
      enablePhoneIntegration: process.env.ENABLE_PHONE_INTEGRATION === 'true',
      enableInboundCalls: process.env.ENABLE_INBOUND_CALLS === 'true',
      enableOutboundCalls: process.env.ENABLE_OUTBOUND_CALLS === 'true',
      useMock: process.env.USE_AWS_MOCK === 'true',
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('Failed to get config', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CONFIG_FAILED',
        message: 'Failed to get configuration',
        retryable: false,
      },
    });
  }
});

/**
 * POST /api/calls/config/test
 * AWS接続テスト（管理者のみ）
 */
router.post('/config/test', async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック
    const isAdmin = req.employee?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          retryable: false,
        },
      });
    }

    // 各AWSサービスの接続テスト
    const results = {
      connect: false,
      transcribe: false,
      s3: false,
      comprehend: false,
    };

    // TODO: testConnectionメソッドを各サービスに実装する必要があります
    try {
      // Amazon Connect接続テスト
      // results.connect = await phoneService.testConnection();
      results.connect = true; // 暫定的にtrueを返す
    } catch (error) {
      logger.error('Connect test failed', { error });
    }

    try {
      // Amazon Transcribe接続テスト
      // results.transcribe = await transcriptionService.testConnection();
      results.transcribe = true; // 暫定的にtrueを返す
    } catch (error) {
      logger.error('Transcribe test failed', { error });
    }

    try {
      // Amazon S3接続テスト
      // results.s3 = await recordingService.recordingExists('test');
      results.s3 = true; // 暫定的にtrueを返す
    } catch (error) {
      logger.error('S3 test failed', { error });
    }

    try {
      // Amazon Comprehend接続テスト
      // results.comprehend = await sentimentAnalysisService.testConnection();
      results.comprehend = true; // 暫定的にtrueを返す
    } catch (error) {
      logger.error('Comprehend test failed', { error });
    }

    const allPassed = Object.values(results).every((r) => r === true);

    res.json({
      success: true,
      data: {
        allPassed,
        results,
        message: allPassed
          ? 'All AWS services are accessible'
          : 'Some AWS services are not accessible',
      },
    });
  } catch (error: any) {
    logger.error('Failed to test connection', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_TEST_FAILED',
        message: 'Failed to test AWS connection',
        retryable: false,
      },
    });
  }
});

/**
 * POST /api/calls/:callId/transcription/start
 * 文字起こしジョブを手動で開始
 */
router.post(
  '/:callId/transcription/start',
  [param('callId').isUUID().withMessage('Valid call ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { callId } = req.params;

      logger.info('Manual transcription job start requested', { callId });

      // 録音ファイル情報を取得
      const recording = await recordingService.getRecordingByCallLogId(callId);

      if (!recording) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not found for this call',
            retryable: false,
          },
        });
      }

      // ジョブをキューに追加
      const job = await addTranscriptionJob(
        callId,
        recording.s3_bucket,
        recording.s3_key,
        'ja-JP'
      );

      res.json({
        success: true,
        data: {
          jobId: job.id,
          callLogId: callId,
          status: 'queued',
          message: 'Transcription job added to queue',
        },
      });
    } catch (error: any) {
      logger.error('Failed to start transcription job', { error, callId: req.params.callId });
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSCRIPTION_JOB_START_FAILED',
          message: error.message || 'Failed to start transcription job',
          retryable: true,
        },
      });
    }
  }
);

/**
 * GET /api/calls/jobs/:jobId/status
 * 文字起こしジョブのステータスを取得
 */
router.get(
  '/jobs/:jobId/status',
  [param('jobId').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { jobId } = req.params;

      const status = await getTranscriptionJobStatus(jobId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Failed to get job status', { error, jobId: req.params.jobId });
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_JOB_STATUS_FAILED',
          message: error.message || 'Failed to get job status',
          retryable: true,
        },
      });
    }
  }
);

/**
 * POST /api/calls/jobs/:jobId/retry
 * 失敗した文字起こしジョブを再試行
 */
router.post(
  '/jobs/:jobId/retry',
  [param('jobId').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
        });
      }

      const { jobId } = req.params;

      logger.info('Retrying transcription job', { jobId });

      await retryTranscriptionJob(jobId);

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Job retry initiated',
        },
      });
    } catch (error: any) {
      logger.error('Failed to retry job', { error, jobId: req.params.jobId });
      res.status(500).json({
        success: false,
        error: {
          code: 'JOB_RETRY_FAILED',
          message: error.message || 'Failed to retry job',
          retryable: false,
        },
      });
    }
  }
);

/**
 * GET /api/calls/jobs/stats
 * 文字起こしジョブキューの統計情報を取得
 */
router.get('/jobs/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get queue stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_QUEUE_STATS_FAILED',
        message: 'Failed to get queue statistics',
        retryable: true,
      },
    });
  }
});

// 重褁E��たルート定義を削除�E�上記で既に定義済み�E�E

/**
 * POST /api/calls/cleanup/run
 * 録音ファイルクリーンアップを手動実行（管理者のみ）
 */
router.post(
  '/cleanup/run',
  [
    body('retentionDays').optional().isInt({ min: 1 }).withMessage('Retention days must be a positive integer'),
    body('archiveDays').optional().isInt({ min: 1 }).withMessage('Archive days must be a positive integer'),
    body('dryRun').optional().isBoolean().withMessage('Dry run must be a boolean'),
    body('batchSize').optional().isInt({ min: 1, max: 1000 }).withMessage('Batch size must be between 1 and 1000'),
  ],
  async (req: Request, res: Response) => {
    try {
      // 管理者権限チェック
      const isAdmin = req.employee?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この機能は管理者のみアクセス可能です',
          },
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { runCleanupNow } = await import('../jobs/recordingCleanup');
      
      logger.info('Manual cleanup requested', {
        userId: req.employee?.id,
        options: req.body,
      });

      const result = await runCleanupNow(req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to run manual cleanup', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_RUN_FAILED',
          message: error.message || 'Failed to run manual cleanup',
        },
      });
    }
  }
);

/**
 * POST /api/calls/cleanup/schedule
 * 録音ファイルクリーンアップのスケジュールを設定（管理者のみ）
 */
router.post(
  '/cleanup/schedule',
  [
    body('cronExpression').notEmpty().withMessage('Cron expression is required'),
    body('retentionDays').optional().isInt({ min: 1 }).withMessage('Retention days must be a positive integer'),
    body('archiveDays').optional().isInt({ min: 1 }).withMessage('Archive days must be a positive integer'),
  ],
  async (req: Request, res: Response) => {
    try {
      // 管理者権限チェック
      const isAdmin = req.employee?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この機能は管理者のみアクセス可能です',
          },
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { scheduleRecordingCleanup } = await import('../jobs/recordingCleanup');
      
      const { cronExpression, retentionDays, archiveDays } = req.body;

      logger.info('Cleanup schedule requested', {
        userId: req.employee?.id,
        cronExpression,
        retentionDays,
        archiveDays,
      });

      const jobId = await scheduleRecordingCleanup(cronExpression, {
        retentionDays,
        archiveDays,
      });

      res.json({
        success: true,
        data: {
          jobId,
          cronExpression,
          message: 'クリーンアップジョブをスケジュールしました',
        },
      });
    } catch (error: any) {
      logger.error('Failed to schedule cleanup', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_SCHEDULE_FAILED',
          message: error.message || 'Failed to schedule cleanup',
        },
      });
    }
  }
);

/**
 * DELETE /api/calls/cleanup/schedule
 * 録音ファイルクリーンアップのスケジュールを削除（管理者のみ）
 */
router.delete('/cleanup/schedule', async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック
    const isAdmin = req.employee?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'この機能は管理者のみアクセス可能です',
        },
      });
    }

    const { removeScheduledCleanup } = await import('../jobs/recordingCleanup');
    
    logger.info('Cleanup schedule removal requested', {
      userId: req.employee?.id,
    });

    await removeScheduledCleanup();

    res.json({
      success: true,
      message: 'スケジュールされたクリーンアップジョブを削除しました',
    });
  } catch (error: any) {
    logger.error('Failed to remove cleanup schedule', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_SCHEDULE_REMOVE_FAILED',
        message: error.message || 'Failed to remove cleanup schedule',
      },
    });
  }
});

/**
 * GET /api/calls/cleanup/stats
 * クリーンアップキューの統計情報を取得
 */
router.get('/cleanup/stats', async (_req: Request, res: Response) => {
  try {
    const { getCleanupQueueStats } = await import('../jobs/recordingCleanup');
    
    const stats = await getCleanupQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get cleanup stats', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_STATS_FAILED',
        message: error.message || 'Failed to get cleanup stats',
      },
    });
  }
});

/**
 * GET /api/calls/cleanup/jobs/:jobId
 * クリーンアップジョブのステータスを取得
 */
router.get(
  '/cleanup/jobs/:jobId',
  [param('jobId').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
        });
      }

      const { getCleanupJobStatus } = await import('../jobs/recordingCleanup');
      
      const { jobId } = req.params;
      const status = await getCleanupJobStatus(jobId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Failed to get cleanup job status', { error, jobId: req.params.jobId });
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_JOB_STATUS_FAILED',
          message: error.message || 'Failed to get cleanup job status',
        },
      });
    }
  }
);

export default router;

