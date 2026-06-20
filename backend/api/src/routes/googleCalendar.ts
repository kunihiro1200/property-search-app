import { Router, Request, Response } from 'express';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { authenticate } from '../middleware/auth';

const router = Router();
const googleAuthService = new GoogleAuthService();

/**
 * Google Calendar OAuth認証を開始（会社アカウント用）
 * GET /api/auth/google/calendar
 */
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const authUrl = await googleAuthService.getAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      error: {
        code: 'AUTH_URL_ERROR',
        message: error.message || 'Failed to generate authentication URL',
        retryable: false,
      },
    });
  }
});

/**
 * Google Calendar OAuth コールバック（認証不要）- 会社アカウント用
 * GET /api/auth/google/calendar/callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, error: oauthError } = req.query;

    // OAuth エラーチェック
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(
        `${process.env.FRONTEND_URL}/employees/calendar-status?calendar_error=${oauthError}`
      );
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(
        `${process.env.FRONTEND_URL}/employees/calendar-status?calendar_error=no_code`
      );
    }

    // 認証コードをトークンに交換（会社アカウント用）
    await googleAuthService.exchangeCodeForTokens(code);

    // 成功時はフロントエンドにリダイレクト
    res.redirect(`${process.env.FRONTEND_URL}/employees/calendar-status?calendar_connected=true`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    
    // エラーメッセージをURLエンコード
    const errorMessage = encodeURIComponent(error.message || 'exchange_failed');
    res.redirect(
      `${process.env.FRONTEND_URL}/employees/calendar-status?calendar_error=${errorMessage}`
    );
  }
});

/**
 * Google Calendar連携を解除（会社アカウント用）
 * POST /api/auth/google/calendar/revoke
 */
router.post('/revoke', authenticate, async (_req: Request, res: Response) => {
  try {
    await googleAuthService.revokeAccess();
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error: any) {
    console.error('Revoke access error:', error);
    res.status(500).json({
      error: {
        code: 'REVOKE_ERROR',
        message: 'Failed to disconnect Google Calendar',
        retryable: true,
      },
    });
  }
});

/**
 * Google Calendar接続状態を確認（会社アカウント用）
 * GET /api/auth/google/calendar/status
 */
router.get('/status', authenticate, async (_req: Request, res: Response) => {
  try {
    const isConnected = await googleAuthService.isConnected();
    res.json({ connected: isConnected });
  } catch (error: any) {
    console.error('Check connection status error:', error);
    res.status(500).json({
      error: {
        code: 'STATUS_CHECK_ERROR',
        message: 'Failed to check connection status',
        retryable: true,
      },
    });
  }
});

/**
 * Webhookを登録
 * POST /api/auth/google/calendar/webhook/register
 */
router.post('/webhook/register', authenticate, async (_req: Request, res: Response) => {
  try {
    const { CalendarWebhookService } = await import('../services/CalendarWebhookService');
    const webhookService = new CalendarWebhookService();
    const supabase = webhookService['supabase'];

    // OAuth2クライアントを取得
    const oauth2Client = await googleAuthService.getAuthenticatedClient();

    // 会社アカウントIDを取得
    const { data: admin } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!admin) {
      return res.status(400).json({ error: 'Company account not configured' });
    }

    // Webhookを登録
    const channel = await webhookService.registerWebhook(admin.id, oauth2Client);

    return res.json({
      message: 'Webhook registered successfully',
      channel: {
        id: channel.channel_id,
        expiration: channel.expiration,
      },
    });
  } catch (error: any) {
    console.error('Webhook registration error:', error);
    return res.status(500).json({
      error: {
        code: 'WEBHOOK_REGISTER_ERROR',
        message: error.message || 'Failed to register webhook',
        retryable: true,
      },
    });
  }
});

/**
 * Webhookを解除
 * POST /api/auth/google/calendar/webhook/unregister
 */
router.post('/webhook/unregister', authenticate, async (_req: Request, res: Response) => {
  try {
    const { CalendarWebhookService } = await import('../services/CalendarWebhookService');
    const webhookService = new CalendarWebhookService();
    const supabase = webhookService['supabase'];

    // OAuth2クライアントを取得
    const oauth2Client = await googleAuthService.getAuthenticatedClient();

    // 会社アカウントIDを取得
    const { data: admin } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!admin) {
      return res.status(400).json({ error: 'Company account not configured' });
    }

    // 既存のWebhookを取得
    const channel = await webhookService.getWebhookByEmployeeId(admin.id);

    if (!channel) {
      return res.status(404).json({ error: 'No webhook found' });
    }

    // Webhookを解除
    await webhookService.unregisterWebhook(channel.channel_id, oauth2Client);

    return res.json({ message: 'Webhook unregistered successfully' });
  } catch (error: any) {
    console.error('Webhook unregistration error:', error);
    return res.status(500).json({
      error: {
        code: 'WEBHOOK_UNREGISTER_ERROR',
        message: error.message || 'Failed to unregister webhook',
        retryable: true,
      },
    });
  }
});

/**
 * Webhook状態を確認
 * GET /api/auth/google/calendar/webhook/status
 */
router.get('/webhook/status', authenticate, async (_req: Request, res: Response) => {
  try {
    const { CalendarWebhookService } = await import('../services/CalendarWebhookService');
    const webhookService = new CalendarWebhookService();
    const supabase = webhookService['supabase'];

    // 会社アカウントIDを取得
    const { data: admin } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!admin) {
      return res.json({ registered: false });
    }

    // Webhookを取得
    const channel = await webhookService.getWebhookByEmployeeId(admin.id);

    if (!channel) {
      return res.json({ registered: false });
    }

    // 有効期限を確認
    const now = new Date();
    const expiration = new Date(channel.expiration);
    const isExpired = now > expiration;

    return res.json({
      registered: true,
      expired: isExpired,
      expiration: channel.expiration,
      channelId: channel.channel_id,
    });
  } catch (error: any) {
    console.error('Webhook status check error:', error);
    return res.status(500).json({
      error: {
        code: 'WEBHOOK_STATUS_ERROR',
        message: 'Failed to check webhook status',
        retryable: true,
      },
    });
  }
});

export default router;
