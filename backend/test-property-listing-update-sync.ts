/**
 * 物件リスト更新同期のテストスクリプト
 * 
 * PropertyListingSyncService.syncUpdatedPropertyListings() を直接テストします。
 * 
 * 使用方法:
 *   npx ts-node backend/test-property-listing-update-sync.ts
 */

import { config } from 'dotenv';
config();

import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function testPropertyListingUpdateSync() {
  console.log('🧪 物件リスト更新同期テスト\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. サービスを初期化
    console.log('\n📋 ステップ 1: サービスの初期化...');
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    console.log('✅ サービスの初期化完了');
    
    // 2. 環境変数を確認
    console.log('\n📋 ステップ 2: 環境変数の確認...');
    const requiredEnvVars = [
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];
    
    let allEnvVarsSet = true;
    for (const envVar of requiredEnvVars) {
      const isSet = !!process.env[envVar];
      console.log(`   ${envVar}: ${isSet ? '✅ 設定済み' : '❌ 未設定'}`);
      if (!isSet) allEnvVarsSet = false;
    }
    
    if (!allEnvVarsSet) {
      console.log('\n❌ 必要な環境変数が設定されていません');
      console.log('   .envファイルを確認してください');
      process.exit(1);
    }
    
    // 3. 物件リスト更新同期を実行
    console.log('\n📋 ステップ 3: 物件リスト更新同期の実行...');
    console.log('   スプレッドシートID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY');
    console.log('   シート名: 物件');
    console.log('   処理中...\n');
    
    const startTime = Date.now();
    const result = await syncService.syncPropertyListingUpdates();
    const duration = Date.now() - startTime;
    
    // 4. 結果を表示
    console.log('\n' + '='.repeat(60));
    console.log('📊 テスト結果');
    console.log('='.repeat(60));
    console.log(`\n✅ 実行完了`);
    console.log(`   成功: ${result.success ? 'はい' : 'いいえ'}`);
    console.log(`   更新件数: ${result.updated}`);
    console.log(`   失敗件数: ${result.failed}`);
    console.log(`   実行時間: ${duration}ms (${(duration / 1000).toFixed(2)}秒)`);
    
    // 5. エラー詳細を表示
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      result.errors.forEach((err, index) => {
        console.log(`\n   ${index + 1}. 物件番号: ${err.property_number}`);
        console.log(`      エラー: ${err.error}`);
      });
    } else if (result.updated === 0 && result.failed === 0) {
      console.log('\n✅ 更新が必要な物件はありませんでした');
      console.log('   スプレッドシートとデータベースは同期されています');
    } else if (result.updated > 0) {
      console.log(`\n✅ ${result.updated}件の物件が正常に更新されました`);
    }
    
    // 6. 次のステップを提案
    console.log('\n' + '='.repeat(60));
    console.log('📝 次のステップ');
    console.log('='.repeat(60));
    
    if (result.success) {
      console.log('\n✅ 物件リスト更新同期は正常に動作しています');
      console.log('\n推奨アクション:');
      console.log('1. 自動同期が有効になっているか確認');
      console.log('   → バックエンドログで "Phase 4.5: Property Listing Update Sync" を確認');
      console.log('2. sync_logsテーブルで同期履歴を確認');
      console.log('   → npx ts-node backend/diagnose-auto-sync-status.ts');
    } else {
      console.log('\n⚠️  物件リスト更新同期でエラーが発生しました');
      console.log('\nトラブルシューティング:');
      console.log('1. スプレッドシートIDとシート名を確認');
      console.log('2. サービスアカウントの権限を確認');
      console.log('3. sync_logsテーブルが存在するか確認');
      console.log('   → Migration 068を実行: npx ts-node backend/migrations/run-068-migration.ts');
      console.log('4. バックエンドログでエラーメッセージを確認');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ テスト失敗');
    console.log('='.repeat(60));
    console.log(`\nエラー: ${error.message}`);
    
    if (error.stack) {
      console.log('\nスタックトレース:');
      console.log(error.stack);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 トラブルシューティング');
    console.log('='.repeat(60));
    console.log('\n1. 環境変数が正しく設定されているか確認');
    console.log('   → .envファイルを確認');
    console.log('2. Supabaseに接続できるか確認');
    console.log('   → SUPABASE_URLとSUPABASE_SERVICE_KEYを確認');
    console.log('3. Google Sheetsに接続できるか確認');
    console.log('   → サービスアカウントの設定を確認');
    console.log('4. sync_logsテーブルが存在するか確認');
    console.log('   → Migration 068を実行');
    console.log('\n詳細は AUTO_SYNC_PROPERTY_LISTING_UPDATE_ANALYSIS.md を参照してください');
    console.log('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// メイン実行
testPropertyListingUpdateSync().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});
