import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { CalendarSyncService } from '../services/CalendarSyncService';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testSync() {
  console.log('🔄 Testing calendar sync...\n');

  try {
    const authService = new GoogleAuthService();
    const syncService = new CalendarSyncService();

    // カレンダーが接続されているか確認
    const isConnected = await authService.isConnected();
    if (!isConnected) {
      console.error('❌ Google Calendar is not connected');
      process.exit(1);
    }

    console.log('✅ Calendar is connected');

    // OAuth2クライアントを取得
    console.log('🔑 Getting authenticated client...');
    const oauth2Client = await authService.getAuthenticatedClient();

    // 会社アカウントIDを取得
    const supabase = syncService['supabase'];
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

    // 同期を実行
    console.log('\n🔄 Starting sync...');
    const result = await syncService.syncCalendarChanges(admin.id, oauth2Client);

    console.log('\n✅ Sync completed!');
    console.log(`   Deleted events: ${result.deletedEvents.length}`);
    console.log(`   Modified events: ${result.modifiedEvents.length}`);
    console.log(`   New events: ${result.newEvents.length}`);

    if (result.deletedEvents.length > 0) {
      console.log('\n🗑️ Deleted event IDs:');
      result.deletedEvents.forEach((id) => console.log(`   - ${id}`));
    }

    console.log('\n🎉 Test complete!');
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

testSync();
