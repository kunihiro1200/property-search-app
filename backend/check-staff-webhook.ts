import { StaffManagementService } from './src/services/StaffManagementService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * スタッフのWebhook URLを確認
 */
async function checkStaffWebhook() {
  console.log('🔍 Checking staff webhook URL\n');
  
  // 環境変数を確認
  console.log('環境変数チェック:');
  console.log(`   - GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   - GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log('');

  const staffService = new StaffManagementService();
  const assigneeName = '角井';

  try {
    console.log(`担当者名: ${assigneeName}`);
    
    const result = await staffService.getWebhookUrl(assigneeName);

    console.log('\n結果:');
    console.log(`   - success: ${result.success}`);
    
    if (result.success) {
      console.log(`   - webhookUrl: ${result.webhookUrl}`);
      console.log('\n✅ Webhook URL found!');
      console.log('✅ This assignee can be used for testing!');
    } else {
      console.log(`   - error: ${result.error}`);
      console.log('\n❌ Webhook URL not found');
      console.log('💡 Please check the staff spreadsheet and ensure the webhook URL is set');
    }

  } catch (err: any) {
    console.error('❌ Check failed:', err.message);
  }
}

checkStaffWebhook()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
