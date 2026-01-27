import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAutoSyncExecution() {
  console.log('=== 自動同期実行状況の確認 ===\n');

  // 1. 環境変数の確認
  console.log('1. 環境変数の確認:');
  console.log(`   AUTO_SYNC_ENABLED: ${process.env.AUTO_SYNC_ENABLED}`);
  console.log(`   AUTO_SYNC_INTERVAL_MINUTES: ${process.env.AUTO_SYNC_INTERVAL_MINUTES}`);
  console.log('');

  // 2. sync_logsテーブルの最新ログを確認
  console.log('2. sync_logsテーブルの最新ログ（最新10件）:');
  const { data: syncLogs, error: syncLogsError } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  if (syncLogsError) {
    console.error('   エラー:', syncLogsError);
  } else if (!syncLogs || syncLogs.length === 0) {
    console.log('   ❌ ログが見つかりません（自動同期が実行されていない可能性）');
  } else {
    console.log(`   ✅ ${syncLogs.length}件のログが見つかりました:`);
    syncLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ID: ${log.id}`);
      console.log(`      開始: ${log.started_at}`);
      console.log(`      完了: ${log.completed_at || '未完了'}`);
      console.log(`      ステータス: ${log.status}`);
      console.log(`      トリガー: ${log.trigger_type || '不明'}`);
      console.log('');
    });
  }

  // 3. property_listingsテーブルのAA13453を確認
  console.log('3. AA13453の最新情報:');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, created_at, updated_at')
    .eq('property_number', 'AA13453')
    .single();

  if (propertyError) {
    console.error('   エラー:', propertyError);
  } else if (!property) {
    console.log('   ❌ AA13453が見つかりません');
  } else {
    console.log(`   ✅ AA13453が存在します:`);
    console.log(`      作成日時: ${property.created_at}`);
    console.log(`      更新日時: ${property.updated_at}`);
    
    // 作成日時から経過時間を計算
    const createdAt = new Date(property.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    console.log(`      作成からの経過時間: ${hoursSinceCreation.toFixed(1)}時間`);
  }
  console.log('');

  // 4. 最近作成された物件を確認（AA13453の前後）
  console.log('4. 最近作成された物件（最新10件）:');
  const { data: recentProperties, error: recentError } = await supabase
    .from('property_listings')
    .select('property_number, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('   エラー:', recentError);
  } else if (!recentProperties || recentProperties.length === 0) {
    console.log('   ❌ 物件が見つかりません');
  } else {
    console.log(`   ✅ ${recentProperties.length}件の物件が見つかりました:`);
    recentProperties.forEach((prop, index) => {
      const isAA13453 = prop.property_number === 'AA13453';
      const marker = isAA13453 ? ' ← AA13453' : '';
      console.log(`   ${index + 1}. ${prop.property_number}: ${prop.created_at}${marker}`);
    });
  }
  console.log('');

  // 5. 結論
  console.log('=== 結論 ===');
  if (!syncLogs || syncLogs.length === 0) {
    console.log('❌ 自動同期が実行されていない可能性が高い');
    console.log('   - sync_logsテーブルにログが全く存在しない');
    console.log('   - サーバー起動時にEnhancedPeriodicSyncManager.start()が失敗している可能性');
    console.log('   - または、サーバーが再起動されていない可能性');
  } else {
    const latestLog = syncLogs[0];
    const latestLogTime = new Date(latestLog.started_at);
    const now = new Date();
    const minutesSinceLastSync = (now.getTime() - latestLogTime.getTime()) / (1000 * 60);
    
    console.log(`✅ 自動同期は実行されている（最終実行: ${minutesSinceLastSync.toFixed(1)}分前）`);
    
    if (property) {
      const createdAt = new Date(property.created_at);
      if (createdAt > latestLogTime) {
        console.log('⚠️ AA13453は最後の自動同期の後に作成された');
        console.log('   - 次の自動同期（5分後）で検出される予定');
      } else {
        console.log('✅ AA13453は自動同期によって作成された');
      }
    }
  }
}

checkAutoSyncExecution()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
