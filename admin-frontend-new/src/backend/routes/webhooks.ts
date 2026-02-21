import express, { Request, Response } from 'express';
import { CalendarWebhookService, WebhookHeaders } from '../services/CalendarWebhookService';
import { CalendarSyncService } from '../services/CalendarSyncService';
import { GoogleAuthService } from '../services/GoogleAuthService';

const router = express.Router();
const webhookService = new CalendarWebhookService();
const syncService = new CalendarSyncService();
const authService = new GoogleAuthService();

/**
 * POST /api/webhooks/calendar
 * Google Calendarからのwebhook通知を受信
 */
router.post('/calendar', async (req: Request, res: Response) => {
  try {
    // ヘッダーを取得
    const headers: WebhookHeaders = {
      'x-goog-channel-id': req.headers['x-goog-channel-id'] as string,
      'x-goog-channel-token': req.headers['x-goog-channel-token'] as string,
      'x-goog-resource-id': req.headers['x-goog-resource-id'] as string,
      'x-goog-resource-state': req.headers['x-goog-resource-state'] as string,
      'x-goog-message-number': req.headers['x-goog-message-number'] as string,
    };

    console.log('📨 Webhook notification received:', {
      channelId: headers['x-goog-channel-id'],
      state: headers['x-goog-resource-state'],
      messageNumber: headers['x-goog-message-number'],
    });

    // 署名を検証
    const isValid = await webhookService.verifyWebhookSignature(headers);
    if (!isValid) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // 非同期で処理（迅速に応答するため）
    setImmediate(async () => {
      try {
        await webhookService.handleWebhookNotification(headers, req.body);

        // exists状態の場合、同期を実行
        if (headers['x-goog-resource-state'] === 'exists') {
          // チャンネルIDから従業員IDを取得
          const { data: channel } = await webhookService
            .table('calendar_webhook_channels')
            .select('employee_id')
            .eq('channel_id', headers['x-goog-channel-id'])
            .single();

          if (channel) {
            // OAuth2クライアントを取得して同期
            const oauth2Client = await authService.getAuthenticatedClient();
            await syncService.syncCalendarChanges(channel.employee_id, oauth2Client);
          }
        }
      } catch (error: any) {
        console.error('Error processing webhook notification:', error);
      }
    });

    // 迅速に200を返す
    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Webhook endpoint error:', error);

    if (error.message?.includes('Unknown webhook channel')) {
      return res.status(404).json({ error: 'Webhook channel not found' });
    }

    if (error.message?.includes('expired')) {
      return res.status(410).json({ error: 'Webhook channel expired' });
    }

    res.status(400).json({ error: 'Bad request' });
  }
});

export default router;
