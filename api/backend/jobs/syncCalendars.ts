/**
 * 定期カレンダー同期ジョブ
 * 15分ごとに実行して、すべての接続済み従業員のカレンダーを同期
 */

import { CalendarSyncService } from '../services/CalendarSyncService';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllCalendars() {
  console.log('🔄 Starting periodic calendar sync job...');
  console.log(`   Time: ${new Date().toISOString()}`);

  const syncService = new CalendarSyncService();
  const authService = new GoogleAuthService();

  try {
    // すべての接続済み従業員を取得
    const { data: tokens, error } = await supabase
      .from('google_calendar_tokens')
      .select('employee_id');

    if (error) {
      throw new Error(`Failed to fetch connected employees: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('   ℹ️ No connected employees found');
      return;
    }

    console.log(`   Found ${tokens.length} connected employees`);

    let successCount = 0;
    let errorCount = 0;

    // 各従業員のカレンダーを同期
    for (const token of tokens) {
      try {
        console.log(`   Syncing employee ${token.employee_id}...`);

        // OAuth2クライアントを取得
        const oauth2Client = await authService.getAuthenticatedClient();

        // リトライ付きで同期
        const result = await syncService.syncWithRetry(token.employee_id, oauth2Client);

        console.log(`   ✅ Synced employee ${token.employee_id}`);
        console.log(`      Deleted: ${result.deletedEvents.length}`);
        console.log(`      Modified: ${result.modifiedEvents.length}`);

        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to sync employee ${token.employee_id}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('✅ Periodic calendar sync completed');
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error: any) {
    console.error('❌ Periodic calendar sync failed:', error);
    throw error;
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  syncAllCalendars()
    .then(() => {
      console.log('🎉 Sync job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sync job failed:', error);
      process.exit(1);
    });
}

export { syncAllCalendars };
