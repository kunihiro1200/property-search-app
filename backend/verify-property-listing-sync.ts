/**
 * 物件リスト更新同期を手動で実行して確認するスクリプト
 * 
 * 使い方:
 *   npx ts-node verify-property-listing-sync.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function verifyPropertyListingSync() {
  console.log('🔍 物件リスト更新同期を手動実行します...\n');

  try {
    // EnhancedAutoSyncServiceをインポート
    const { getEnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    
    const syncService = getEnhancedAutoSyncService();
    
    // 初期化
    console.log('📋 初期化中...');
    await syncService.initialize();
    console.log('✅ 初期化完了\n');
    
    // 物件リスト更新同期のみを実行
    console.log('🏢 物件リスト更新同期を実行中...');
    const result = await syncService.syncPropertyListingUpdates();
    
    console.log('\n📊 実行結果:');
    console.log(`   成功: ${result.success ? 'はい' : 'いいえ'}`);
    console.log(`   更新件数: ${result.updated}`);
    console.log(`   失敗件数: ${result.failed}`);
    console.log(`   実行時間: ${(result.duration_ms / 1000).toFixed(2)}秒`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      result.errors.forEach(err => {
        console.log(`   - ${err.property_number}: ${err.error}`);
      });
    }
    
    if (result.updated === 0 && result.failed === 0) {
      console.log('\n✅ スプレッドシートとDBは完全に同期されています');
      console.log('   更新が必要な物件はありませんでした');
    } else if (result.updated > 0) {
      console.log(`\n✅ ${result.updated}件の物件情報を更新しました`);
    }
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('\n詳細:', error.stack);
    
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. backend/.envファイルが存在するか確認');
    console.log('   2. GOOGLE_SERVICE_ACCOUNT_KEY_PATHが正しく設定されているか確認');
    console.log('   3. google-service-account.jsonファイルが存在するか確認');
    console.log('   4. Supabase接続情報が正しいか確認');
    
    process.exit(1);
  }
}

// 実行
verifyPropertyListingSync();
