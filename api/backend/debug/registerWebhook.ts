import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { CalendarWebhookService } from '../services/CalendarWebhookService';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function registerWebhook() {
  console.log('📡 Registering webhook...\n');

  try {
    const authService = new GoogleAuthService();
    const webhookService = new CalendarWebhookService();

    // カレンダーが接続されているか確認
    const isConnected = await authService.isConnected();
    if (!isConnected) {
      console.error('❌ Google Calendar is not connected');
      console.log('   Please connect your calendar first');
      process.exit(1);
    }

    console.log('✅ Calendar is connected');

    // OAuth2クライアントを取得
    console.log('🔑 Getting authenticated client...');
    const oauth2Client = await authService.getAuthenticatedClient();

    // 会社アカウントIDを取得
    const supabase = webhookService['supabase'];
    const { data: admin } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!admin) {
      console.error('❌ No admin user found');
      process.exit(1);
    }

    console.log(`👤 Admin employee ID: ${admin.id}`);

    // Webhookを登録
    console.log('📡 Registering webhook with Google Calendar...');
    const channel = await webhookService.registerWebhook(admin.id, oauth2Client);

    console.log('\n✅ Webhook registered successfully!');
    console.log(`   Channel ID: ${channel.channel_id}`);
    console.log(`   Resource ID: ${channel.resource_id}`);
    console.log(`   Expiration: ${channel.expiration}`);
    console.log('\n🎉 You can now test calendar deletion sync!');
  } catch (error: any) {
    console.error('\n❌ Failed to register webhook:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

registerWebhook();
