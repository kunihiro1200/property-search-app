import { ScheduledNotificationService } from './src/services/ScheduledNotificationService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * スケジュールされた通知を処理
 * 
 * このスクリプトは定期的に実行され、送信時刻になった通知を送信します。
 * 
 * 実行方法:
 * npx ts-node backend/process-scheduled-notifications.ts
 * 
 * 推奨: cronジョブで1分ごとに実行
 * * * * * * cd /path/to/project && npx ts-node backend/process-scheduled-notifications.ts
 */
async function main() {
  console.log('[process-scheduled-notifications] Starting...');
  console.log('[process-scheduled-notifications] Current time:', new Date().toISOString());

  const service = new ScheduledNotificationService();
  
  try {
    const processedCount = await service.processScheduledNotifications();
    
    if (processedCount > 0) {
      console.log(`[process-scheduled-notifications] Processed ${processedCount} notifications`);
    } else {
      console.log('[process-scheduled-notifications] No notifications to process');
    }
  } catch (error: any) {
    console.error('[process-scheduled-notifications] Error:', error);
    process.exit(1);
  }

  console.log('[process-scheduled-notifications] Done');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
