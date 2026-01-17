/**
 * 自動同期の設定状態を確認するスクリプト
 * 
 * 使い方:
 *   npx ts-node check-auto-sync-status.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

function checkAutoSyncStatus() {
  console.log('🔍 自動同期の設定状態を確認します...\n');

  // 1. AUTO_SYNC_ENABLEDの確認
  const autoSyncEnabled = process.env.AUTO_SYNC_ENABLED;
  const isEnabled = autoSyncEnabled !== 'false';
  
  console.log('📊 自動同期設定:');
  console.log(`   AUTO_SYNC_ENABLED: ${autoSyncEnabled || '(未設定 = 有効)'}`);
  console.log(`   状態: ${isEnabled ? '✅ 有効' : '❌ 無効'}`);
  
  if (!isEnabled) {
    console.log('\n⚠️  自動同期が無効になっています！');
    console.log('   有効にするには:');
    console.log('   1. backend/.envファイルを開く');
    console.log('   2. AUTO_SYNC_ENABLED=false の行を削除するか、trueに変更');
    console.log('   3. バックエンドサーバーを再起動');
  }
  
  // 2. 同期間隔の確認
  const intervalMinutes = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '5', 10);
  console.log(`\n⏰ 同期間隔:`);
  console.log(`   AUTO_SYNC_INTERVAL_MINUTES: ${process.env.AUTO_SYNC_INTERVAL_MINUTES || '(未設定 = 5分)'}`);
  console.log(`   実際の間隔: ${intervalMinutes}分ごと`);
  
  // 3. Google認証情報の確認
  console.log(`\n🔑 Google認証情報:`);
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${keyPath}`);
  
  const fullPath = path.resolve(__dirname, keyPath);
  const keyFileExists = fs.existsSync(fullPath);
  console.log(`   ファイル存在: ${keyFileExists ? '✅ あり' : '❌ なし'}`);
  
  if (!keyFileExists) {
    console.log('\n⚠️  Google認証情報ファイルが見つかりません！');
    console.log(`   期待されるパス: ${fullPath}`);
    console.log('   解決方法:');
    console.log('   1. google-service-account.jsonファイルをbackendフォルダに配置');
    console.log('   2. または、.envファイルでGOOGLE_SERVICE_ACCOUNT_KEY_PATHを正しいパスに設定');
  }
  
  // 4. Supabase接続情報の確認
  console.log(`\n🗄️  Supabase接続情報:`);
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  
  // 5. 総合判定
  console.log(`\n📋 総合判定:`);
  
  const allGood = isEnabled && keyFileExists && 
                  process.env.SUPABASE_URL && 
                  process.env.SUPABASE_SERVICE_KEY;
  
  if (allGood) {
    console.log('   ✅ すべての設定が正常です');
    console.log(`   🔄 自動同期は${intervalMinutes}分ごとに実行されます`);
    console.log('   📊 Phase 4.5で物件リスト更新同期が実行されます');
  } else {
    console.log('   ⚠️  いくつかの設定に問題があります');
    console.log('   上記の警告を確認して修正してください');
  }
  
  // 6. 次のステップ
  console.log(`\n💡 次のステップ:`);
  if (allGood) {
    console.log('   1. バックエンドサーバーを起動: npm run dev');
    console.log('   2. 起動5秒後に初回同期が実行されます');
    console.log('   3. その後、5分ごとに自動同期が実行されます');
    console.log('   4. ログで "Phase 4.5: Property Listing Update Sync" を確認');
    console.log('\n   または、今すぐ手動実行:');
    console.log('   npx ts-node verify-property-listing-sync.ts');
  } else {
    console.log('   1. 上記の警告を確認');
    console.log('   2. 必要な設定を修正');
    console.log('   3. このスクリプトを再実行して確認');
  }
}

// 実行
checkAutoSyncStatus();
