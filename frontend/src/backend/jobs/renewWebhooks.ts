/**
 * Webhook更新ジョブ
 * 1日1回実行して、有効期限が24時間以内のWebhookを更新
 */

import { CalendarWebhookService } from '../services/CalendarWebhookService';
import { GoogleAuthService } from '../services/GoogleAuthService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function renewExpiringWebhooks() {
  console.log('🔄 Starting webhook renewal job...');
  console.log(`   Time: ${new Date().toISOString()}`);

  const webhookService = new CalendarWebhookService();
  const authService = new GoogleAuthService();

  try {
    // 有効期限が24時間以内のWebhookを取得
    const expiringWebhooks = await webhookService.getExpiringWebhooks(24);

    if (expiringWebhooks.length === 0) {
      console.log('   ℹ️ No expiring webhooks found');
      return;
    }

    console.log(`   Found ${expiringWebhooks.length} expiring webhooks`);

    let successCount = 0;
    let errorCount = 0;

    // 各Webhookを更新
    for (const webhook of expiringWebhooks) {
      try {
        console.log(`   Renewing webhook ${webhook.channel_id}...`);
        console.log(`      Employee: ${webhook.employee_id}`);
        console.log(`      Expires: ${webhook.expiration}`);

        // OAuth2クライアントを取得
        const oauth2Client = await authService.getAuthenticatedClient();

        // Webhookを更新
        const newChannel = await webhookService.renewWebhook(webhook.channel_id, oauth2Client);

        console.log(`   ✅ Webhook renewed`);
        console.log(`      New channel: ${newChannel.channel_id}`);
        console.log(`      New expiration: ${newChannel.expiration}`);

        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to renew webhook ${webhook.channel_id}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('✅ Webhook renewal completed');
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error: any) {
    console.error('❌ Webhook renewal failed:', error);
    throw error;
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  renewExpiringWebhooks()
    .then(() => {
      console.log('🎉 Webhook renewal job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Webhook renewal job failed:', error);
      process.exit(1);
    });
}

export { renewExpiringWebhooks };
