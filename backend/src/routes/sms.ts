import express, { Request, Response } from 'express';
import { twilioSmsService } from '../services/TwilioSmsService';

const router = express.Router();

/**
 * SMS一括送信エンドポイント
 * POST /api/sms/send-bulk
 * 
 * Body:
 * {
 *   recipients: Array<{ phoneNumber: string; name: string }>,
 *   message: string (テンプレート、{name}を含む)
 * }
 */
router.post('/send-bulk', async (req: Request, res: Response) => {
  try {
    const { recipients, message } = req.body;

    // バリデーション
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '受信者リストが必要です',
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'メッセージが必要です',
      });
    }

    // Twilioが設定されているか確認
    if (!twilioSmsService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'SMS送信サービスが設定されていません。管理者に連絡してください。',
      });
    }

    // 各受信者用にメッセージをカスタマイズ
    const smsRecipients = recipients.map((recipient: { phoneNumber: string; name: string }) => ({
      phoneNumber: recipient.phoneNumber,
      message: message.replace(/\{name\}/g, recipient.name || 'お客様'),
    }));

    // SMS一括送信
    const result = await twilioSmsService.sendBulkSms(smsRecipients);

    return res.json({
      success: true,
      successCount: result.successCount,
      failedCount: result.failedCount,
      results: result.results,
    });
  } catch (error: any) {
    console.error('Failed to send bulk SMS:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'SMS送信に失敗しました',
    });
  }
});

/**
 * SMS送信テストエンドポイント
 * POST /api/sms/test
 * 
 * Body:
 * {
 *   phoneNumber: string,
 *   message: string
 * }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: '電話番号とメッセージが必要です',
      });
    }

    if (!twilioSmsService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'SMS送信サービスが設定されていません。管理者に連絡してください。',
      });
    }

    const result = await twilioSmsService.sendSms(phoneNumber, message);

    return res.json(result);
  } catch (error: any) {
    console.error('Failed to send test SMS:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'SMS送信に失敗しました',
    });
  }
});

/**
 * SMS送信サービスの状態確認
 * GET /api/sms/status
 */
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = twilioSmsService.isConfigured();
  
  return res.json({
    configured: isConfigured,
    message: isConfigured 
      ? 'SMS送信サービスは正常に動作しています' 
      : 'SMS送信サービスが設定されていません',
  });
});

export default router;
