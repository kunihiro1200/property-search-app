import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { SpreadsheetSyncService } from '../services/SpreadsheetSyncService';
import { EmailIntegrationService, InquiryEmailData } from '../services/EmailIntegrationService';
import { SyncLogger } from '../services/SyncLogger';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets設定
const sheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
  // OAuth 2.0 credentials (優先)
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  // Service Account credentials (フォールバック)
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
};

/**
 * POST /api/integration/inquiry-email
 * 査定依頼メールから売主を自動登録
 */
router.post('/inquiry-email', async (req: Request, res: Response) => {
  try {
    const emailData: InquiryEmailData = req.body;

    // サービスを初期化
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    const emailService = new EmailIntegrationService(supabase, syncService);
    const logger = new SyncLogger(supabase);

    // ログを開始
    const logId = await logger.startSyncLog('create', undefined, {
      source: 'email_integration',
      inquirySource: emailData.inquirySource,
    });

    // メールを処理
    const result = await emailService.handleInquiryEmail(emailData);

    if (result.success) {
      // ログを完了
      await logger.completeSyncLog(logId, 'success', 1);

      res.status(201).json({
        success: true,
        message: 'Seller created successfully',
        data: {
          sellerId: result.sellerId,
          sellerNumber: result.sellerNumber,
        },
      });
    } else {
      // エラーログを記録
      await logger.logError('validation', result.error || 'Unknown error', {
        operation: 'inquiry_email',
        metadata: { emailData },
      });

      // ログを完了
      await logger.completeSyncLog(logId, 'failure', 0, result.error);

      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Email integration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/integration/inquiry-email/batch
 * 複数の査定依頼メールを一括処理
 */
router.post('/inquiry-email/batch', async (req: Request, res: Response) => {
  try {
    const emails: InquiryEmailData[] = req.body.emails;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emails array is required',
      });
    }

    // サービスを初期化
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    const emailService = new EmailIntegrationService(supabase, syncService);
    const logger = new SyncLogger(supabase);

    // ログを開始
    const logId = await logger.startSyncLog('batch', undefined, {
      source: 'email_integration_batch',
      count: emails.length,
    });

    // バッチ処理
    const result = await emailService.handleBatchInquiryEmails(emails);

    // ログを完了
    await logger.completeSyncLog(
      logId,
      result.failureCount === 0 ? 'success' : 'failure',
      result.successCount,
      result.failureCount > 0 ? `${result.failureCount} failures` : undefined
    );

    res.status(200).json({
      success: true,
      message: 'Batch processing completed',
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: result.results,
      },
    });
  } catch (error: any) {
    console.error('Batch email integration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/integration/check-duplicates
 * 重複チェック
 */
router.post('/check-duplicates', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber is required',
      });
    }

    // サービスを初期化
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    const emailService = new EmailIntegrationService(supabase, syncService);

    // 重複チェック
    const result = await emailService.checkDuplicates(phoneNumber, email);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
