import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseAutoSyncStatus() {
  console.log('\n=== 自動同期状況診断 ===\n');

  try {
    // 1. 同期ログテーブルの確認
    console.log('1. 同期ログの確認...');
    const { data: syncLogs, error: syncLogsError } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (syncLogsError) {
      console.log('❌ sync_logsテーブルが存在しないか、アクセスできません');
      console.log('エラー:', syncLogsError.message);
    } else {
      console.log(`✅ 最新の同期ログ ${syncLogs?.length || 0} 件を取得`);
      if (syncLogs && syncLogs.length > 0) {
        console.log('\n最新の同期:');
        const latest = syncLogs[0];
        console.log(`  - タイプ: ${latest.sync_type}`);
        console.log(`  - ステータス: ${latest.status}`);
        console.log(`  - 時刻: ${latest.created_at}`);
        console.log(`  - メッセージ: ${latest.message || 'なし'}`);
      } else {
        console.log('⚠️  同期ログが見つかりません');
      }
    }

    // 2. 物件リストの最終更新確認
    console.log('\n2. 物件リストの最終更新確認...');
    const { data: latestProperty, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_number, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (propertyError) {
      console.log('❌ property_listingsテーブルにアクセスできません');
      console.log('エラー:', propertyError.message);
    } else if (latestProperty && latestProperty.length > 0) {
      console.log(`✅ 最新の物件更新: ${latestProperty[0].property_number}`);
      console.log(`   更新日時: ${latestProperty[0].updated_at}`);
      
      const lastUpdate = new Date(latestProperty[0].updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      console.log(`   経過時間: ${hoursSinceUpdate.toFixed(1)} 時間`);
      
      if (hoursSinceUpdate > 24) {
        console.log('⚠️  24時間以上更新されていません');
      }
    } else {
      console.log('⚠️  物件データが見つかりません');
    }

    // 3. 買主リストの最終更新確認
    console.log('\n3. 買主リストの最終更新確認...');
    const { data: latestBuyer, error: buyerError } = await supabase
      .from('buyers')
      .select('buyer_number, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (buyerError) {
      console.log('❌ buyersテーブルにアクセスできません');
      console.log('エラー:', buyerError.message);
    } else if (latestBuyer && latestBuyer.length > 0) {
      console.log(`✅ 最新の買主更新: ${latestBuyer[0].buyer_number}`);
      console.log(`   更新日時: ${latestBuyer[0].updated_at}`);
      
      const lastUpdate = new Date(latestBuyer[0].updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      console.log(`   経過時間: ${hoursSinceUpdate.toFixed(1)} 時間`);
      
      if (hoursSinceUpdate > 24) {
        console.log('⚠️  24時間以上更新されていません');
      }
    } else {
      console.log('⚠️  買主データが見つかりません');
    }

    // 4. 物件リストの件数確認
    console.log('\n4. 物件リストの件数確認...');
    const { count: propertyCount } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ 物件総数: ${propertyCount} 件`);

    // 5. 買主リストの件数確認
    console.log('\n5. 買主リストの件数確認...');
    const { count: buyerCount } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ 買主総数: ${buyerCount} 件`);

    // 6. 同期エラーログの確認
    console.log('\n6. 同期エラーログの確認...');
    const { data: errorLogs, error: errorLogsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!errorLogsError && errorLogs && errorLogs.length > 0) {
      console.log(`⚠️  最近のエラー ${errorLogs.length} 件:`);
      errorLogs.forEach((log, index) => {
        console.log(`\n  ${index + 1}. ${log.sync_type}`);
        console.log(`     時刻: ${log.created_at}`);
        console.log(`     エラー: ${log.error_message || log.message}`);
      });
    } else {
      console.log('✅ 最近のエラーはありません');
    }

    // 7. 環境変数の確認
    console.log('\n7. 環境変数の確認...');
    const requiredEnvVars = [
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY'
    ];

    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: 設定済み`);
      } else {
        console.log(`❌ ${varName}: 未設定`);
      }
    });

    console.log('\n=== 診断完了 ===\n');
    console.log('\n推奨アクション:');
    console.log('1. 同期ログが24時間以上更新されていない場合 → 自動同期が停止している可能性');
    console.log('2. エラーログがある場合 → エラー内容を確認して修正');
    console.log('3. 環境変数が未設定の場合 → .envファイルを確認');
    console.log('4. 手動同期を試す: npm run sync-property-listings または npm run sync-buyers');

  } catch (error) {
    console.error('診断中にエラーが発生しました:', error);
  }
}

diagnoseAutoSyncStatus();
