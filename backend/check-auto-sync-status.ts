import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAutoSyncStatus() {
  console.log('🔍 自動同期の状態を確認...\n');

  // 1. 最近の同期ログを確認
  console.log('📊 Step 1: 最近の同期ログを確認...');
  
  const { data: syncLogs, error: logsError } = await supabase
    .from('seller_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.log('❌ 同期ログテーブルが存在しないか、エラーが発生しました:', logsError.message);
  } else if (!syncLogs || syncLogs.length === 0) {
    console.log('❌ 同期ログが見つかりません');
    console.log('   → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`✅ 同期ログが見つかりました（${syncLogs.length}件）\n`);
    
    syncLogs.forEach((log, index) => {
      const createdAt = new Date(log.created_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);
      
      console.log(`${index + 1}. ${log.sync_type || 'unknown'}`);
      console.log(`   実行時刻: ${createdAt.toLocaleString('ja-JP')}`);
      console.log(`   ${minutesAgo}分前`);
      console.log(`   ステータス: ${log.status || 'unknown'}`);
      console.log(`   売主番号: ${log.seller_number || 'N/A'}`);
      if (log.error_message) {
        console.log(`   エラー: ${log.error_message}`);
      }
      console.log('');
    });

    // 最後の同期からの経過時間を確認
    const lastSync = syncLogs[0];
    const lastSyncTime = new Date(lastSync.created_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000 / 60);

    console.log(`📊 最後の同期: ${minutesSinceLastSync}分前`);
    
    if (minutesSinceLastSync > 10) {
      console.log('⚠️  警告: 最後の同期から10分以上経過しています');
      console.log('   → 自動同期が停止している可能性があります');
    } else if (minutesSinceLastSync > 5) {
      console.log('⚠️  注意: 最後の同期から5分以上経過しています');
    } else {
      console.log('✅ 自動同期は正常に動作しています');
    }
  }

  // 2. バックエンドサーバーの状態を確認
  console.log('\n📊 Step 2: バックエンドサーバーの状態を確認...');
  
  try {
    const response = await fetch('http://localhost:3000/api/sync/health');
    
    if (!response.ok) {
      console.log('❌ ヘルスチェックエンドポイントがエラーを返しました');
      console.log(`   ステータスコード: ${response.status}`);
    } else {
      const health = await response.json();
      console.log('✅ ヘルスチェックエンドポイントが応答しました\n');
      console.log('📝 ヘルスチェック結果:');
      console.log(`  isHealthy: ${health.isHealthy}`);
      console.log(`  lastSyncTime: ${health.lastSyncTime ? new Date(health.lastSyncTime).toLocaleString('ja-JP') : '(なし)'}`);
      console.log(`  lastSyncSuccess: ${health.lastSyncSuccess}`);
      console.log(`  syncIntervalMinutes: ${health.syncIntervalMinutes}`);
      console.log(`  nextScheduledSync: ${health.nextScheduledSync ? new Date(health.nextScheduledSync).toLocaleString('ja-JP') : '(なし)'}`);
      console.log(`  consecutiveFailures: ${health.consecutiveFailures}`);
      
      if (!health.isHealthy) {
        console.log('\n⚠️  警告: ヘルスチェックが不健全な状態を報告しています');
      }
      
      if (health.lastSyncTime) {
        const lastSyncTime = new Date(health.lastSyncTime);
        const now = new Date();
        const minutesSinceLastSync = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000 / 60);
        
        console.log(`\n📊 最後の同期: ${minutesSinceLastSync}分前`);
        
        if (minutesSinceLastSync > 10) {
          console.log('⚠️  警告: 最後の同期から10分以上経過しています');
        }
      }
    }
  } catch (error: any) {
    console.log('❌ バックエンドサーバーに接続できません');
    console.log(`   エラー: ${error.message}`);
    console.log('   → バックエンドサーバーが起動していない可能性があります');
  }

  // 3. 環境変数を確認
  console.log('\n📊 Step 3: 環境変数を確認...');
  
  const autoSyncEnabled = process.env.AUTO_SYNC_ENABLED;
  const autoSyncInterval = process.env.AUTO_SYNC_INTERVAL_MINUTES;
  
  console.log(`  AUTO_SYNC_ENABLED: ${autoSyncEnabled || '(未設定 - デフォルト: true)'}`);
  console.log(`  AUTO_SYNC_INTERVAL_MINUTES: ${autoSyncInterval || '(未設定 - デフォルト: 5)'}`);
  
  if (autoSyncEnabled === 'false') {
    console.log('\n❌ 自動同期が無効化されています！');
    console.log('   → AUTO_SYNC_ENABLED=true に設定してください');
  }

  // 4. 結論
  console.log('\n📊 診断結果:');
  console.log('─────────────────────────────────────');
  
  if (!syncLogs || syncLogs.length === 0) {
    console.log('❌ 自動同期が一度も実行されていません');
    console.log('\n考えられる原因:');
    console.log('  1. バックエンドサーバーが起動していない');
    console.log('  2. EnhancedPeriodicSyncManagerが起動していない');
    console.log('  3. AUTO_SYNC_ENABLEDがfalseに設定されている');
    console.log('  4. 同期ログテーブルが存在しない');
  } else {
    const lastSync = syncLogs[0];
    const lastSyncTime = new Date(lastSync.created_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000 / 60);
    
    if (minutesSinceLastSync > 10) {
      console.log('❌ 自動同期が停止しています');
      console.log(`   最後の同期: ${minutesSinceLastSync}分前`);
      console.log('\n考えられる原因:');
      console.log('  1. バックエンドサーバーがクラッシュした');
      console.log('  2. EnhancedPeriodicSyncManagerが停止した');
      console.log('  3. エラーが発生して同期が停止した');
    } else {
      console.log('✅ 自動同期は正常に動作しています');
      console.log(`   最後の同期: ${minutesSinceLastSync}分前`);
    }
  }
}

checkAutoSyncStatus().catch(console.error);
