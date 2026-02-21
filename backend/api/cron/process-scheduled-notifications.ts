import { ScheduledNotificationService } from '../../src/services/ScheduledNotificationService';

/**
 * Vercel Cron Job用エンドポイント
 * 
 * vercel.jsonで設定:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-scheduled-notifications",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export default async function handler(req: any, res: any) {
  // Vercel Cron Jobの認証チェック
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[Cron] Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Cron] Starting scheduled notifications processing...');
  console.log('[Cron] Current time (UTC):', new Date().toISOString());
  console.log('[Cron] Current time (Tokyo):', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

  const service = new ScheduledNotificationService();
  
  try {
    const processedCount = await service.processScheduledNotifications();
    
    console.log(`[Cron] Processed ${processedCount} notifications`);
    
    res.status(200).json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error processing scheduled notifications:', error);
    console.error('[Cron] Error details:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
