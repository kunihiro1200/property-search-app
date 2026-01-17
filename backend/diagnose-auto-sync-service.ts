import { createClient } from '@supabase/supabase-js';

async function diagnoseAutoSync() {
  console.log('=== 自動同期サービス診断 ===\n');
  
  // 1. 環境変数の確認
  console.log('1. 環境変数の確認');
  console.log(`AUTO_SYNC_ENABLED: ${process.env.AUTO_SYNC_ENABLED}`);
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '設定済み' : '未設定'}`);
  console.log('');
  
  // 2. バックエンドプロセスの確認
  console.log('2. バックエンドプロセスの確認');
  console.log('   ※ 手動で確認してください:');
  console.log('   - バックエンドサーバーが起動しているか');
  console.log('   - 起動ログに "EnhancedAutoSyncService initialized" が表示されているか');
  console.log('   - 起動ログに "Enhanced periodic auto-sync enabled" が表示されているか');
  console.log('');
  
  // 3. sync_logsテーブルの確認
  console.log('3. 同期ログの確認');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);
  
  if (!logs || logs.length === 0) {
    console.log('❌ 同期ログが見つかりません');
    console.log('   → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`✅ 同期ログ: ${logs.length}件`);
    
    // 各同期タイプの最終実行時刻を表示
    const syncTypes = ['seller_addition', 'seller_update', 'seller_deletion', 'work_task', 'property_listing_update'];
    
    syncTypes.forEach(syncType => {
      const log = logs.find(l => l.sync_type === syncType);
      if (log) {
        console.log(`   ${syncType}: ${log.started_at} (${log.status})`);
      } else {
        console.log(`   ${syncType}: ログなし`);
      }
    });
  }
  console.log('');
  
  // 4. 診断結果のサマリー
  console.log('=== 診断結果サマリー ===');
  
  if (!logs || logs.length === 0) {
    console.log('❌ 自動同期が実行されていません');
    console.log('');
    console.log('推奨される対応:');
    console.log('1. バックエンドサーバーを再起動してください');
    console.log('   cd backend && npm run dev');
    console.log('');
    console.log('2. 起動ログで以下を確認してください:');
    console.log('   ✅ EnhancedAutoSyncService initialized');
    console.log('   📊 Enhanced periodic auto-sync enabled');
    console.log('');
  } else {
    const lastSync = new Date(logs[0].started_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
    
    if (minutesSinceLastSync > 10) {
      console.log(`⚠️  最後の同期から${minutesSinceLastSync}分経過しています`);
      console.log('   通常は5分ごとに実行されるはずです');
      console.log('');
      console.log('推奨される対応:');
      console.log('- バックエンドサーバーを再起動してください');
    } else {
      console.log('✅ 自動同期は正常に動作しています');
    }
  }
}

diagnoseAutoSync().catch(console.error);
