import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseStartup() {
  console.log('='.repeat(80));
  console.log('定期同期マネージャー起動診断');
  console.log('='.repeat(80));
  console.log();

  // 1. 環境変数チェック
  console.log('📋 1. 環境変数チェック');
  console.log('-'.repeat(80));
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];

  let allEnvVarsPresent = true;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: 設定済み (${value.substring(0, 20)}...)`);
    } else {
      console.log(`❌ ${envVar}: 未設定`);
      allEnvVarsPresent = false;
    }
  }
  console.log();

  // 2. EnhancedAutoSyncServiceの存在確認
  console.log('📋 2. EnhancedAutoSyncServiceの確認');
  console.log('-'.repeat(80));
  try {
    const { 
      EnhancedAutoSyncService, 
      getEnhancedPeriodicSyncManager,
      isAutoSyncEnabled 
    } = await import('./src/services/EnhancedAutoSyncService');
    console.log('✅ EnhancedAutoSyncServiceのインポート成功');
    
    // サービスのメソッド確認
    const service = new EnhancedAutoSyncService(supabaseUrl, supabaseKey);
    console.log(`✅ EnhancedAutoSyncServiceのインスタンス化成功`);
    console.log(`   - syncPropertyListingUpdates メソッド: ${typeof (service as any).syncPropertyListingUpdates === 'function' ? '存在' : '不在'}`);
    console.log(`   - runFullSync メソッド: ${typeof (service as any).runFullSync === 'function' ? '存在' : '不在'}`);
    
    // 定期同期マネージャーの確認
    const periodicSyncManager = getEnhancedPeriodicSyncManager();
    console.log(`✅ getEnhancedPeriodicSyncManager 関数: 存在`);
    console.log(`   - 同期間隔: ${periodicSyncManager.getIntervalMinutes()}分`);
    console.log(`✅ isAutoSyncEnabled 関数: 存在`);
    console.log(`   - AUTO_SYNC_ENABLED: ${isAutoSyncEnabled() ? '有効' : '無効'}`);
  } catch (error: any) {
    console.log(`❌ EnhancedAutoSyncServiceのロードに失敗: ${error.message}`);
  }
  console.log();

  // 3. バックエンドのindex.tsでの初期化確認
  console.log('📋 3. バックエンドindex.tsの確認');
  console.log('-'.repeat(80));
  try {
    const fs = await import('fs');
    const indexContent = fs.readFileSync('./src/index.ts', 'utf-8');
    
    const hasEnhancedAutoSyncImport = indexContent.includes('getEnhancedPeriodicSyncManager');
    const hasIsAutoSyncEnabled = indexContent.includes('isAutoSyncEnabled');
    const hasPeriodicSyncStart = indexContent.includes('periodicSyncManager.start()');
    
    console.log(`${hasEnhancedAutoSyncImport ? '✅' : '❌'} getEnhancedPeriodicSyncManagerのインポート: ${hasEnhancedAutoSyncImport ? '存在' : '不在'}`);
    console.log(`${hasIsAutoSyncEnabled ? '✅' : '❌'} isAutoSyncEnabledのインポート: ${hasIsAutoSyncEnabled ? '存在' : '不在'}`);
    console.log(`${hasPeriodicSyncStart ? '✅' : '❌'} periodicSyncManager.start()の呼び出し: ${hasPeriodicSyncStart ? '存在' : '不在'}`);
    
    if (!hasEnhancedAutoSyncImport || !hasIsAutoSyncEnabled || !hasPeriodicSyncStart) {
      console.log();
      console.log('⚠️  重要: バックエンドのindex.tsで定期同期が初期化されていない可能性があります');
    } else {
      console.log();
      console.log('✅ バックエンドのindex.tsで定期同期が正しく初期化されています');
    }
  } catch (error: any) {
    console.log(`❌ index.tsの読み込みに失敗: ${error.message}`);
  }
  console.log();

  // 4. 最近の同期ログ確認
  console.log('📋 4. 最近の同期ログ確認 (過去1時間)');
  console.log('-'.repeat(80));
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`❌ sync_logsテーブルの読み取りエラー: ${error.message}`);
    } else if (!logs || logs.length === 0) {
      console.log('⚠️  過去1時間に同期ログが記録されていません');
      console.log('   → 定期同期が実行されていない可能性が高い');
    } else {
      console.log(`✅ ${logs.length}件の同期ログを発見`);
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.created_at} - ${log.sync_type} - ${log.status}`);
      });
    }
  } catch (error: any) {
    console.log(`❌ 同期ログの確認に失敗: ${error.message}`);
  }
  console.log();

  // 5. 診断結果サマリー
  console.log('='.repeat(80));
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(80));
  
  if (!allEnvVarsPresent) {
    console.log('❌ 環境変数が不足しています');
    console.log('   → .envファイルを確認してください');
  }
  
  console.log();
  console.log('🔍 次のステップ:');
  console.log('1. バックエンドサーバーを起動してください: npm run dev');
  console.log('2. 起動ログに "定期同期マネージャーを開始" というメッセージがあるか確認');
  console.log('3. 5分後にこのスクリプトを再実行して同期ログを確認');
  console.log();
}

diagnoseStartup().catch(console.error);
