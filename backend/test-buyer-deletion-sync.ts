/**
 * 買主削除同期のテストスクリプト
 * 買主6929を論理削除します
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function testBuyerDeletionSync() {
  console.log('🔄 Starting buyer deletion sync test...');
  
  const syncService = getEnhancedAutoSyncService();
  
  try {
    // 買主用の初期化
    await syncService.initializeBuyer();
    console.log('✅ Buyer sync service initialized');
    
    // 削除された買主を検出
    console.log('\n📋 Step 1: Detecting deleted buyers...');
    const deletedBuyers = await syncService.detectDeletedBuyers();
    console.log(`Found ${deletedBuyers.length} deleted buyers:`, deletedBuyers);
    
    if (deletedBuyers.length === 0) {
      console.log('✅ No deleted buyers found. All buyers in DB exist in spreadsheet.');
      return;
    }
    
    // 削除同期を実行
    console.log('\n📋 Step 2: Syncing deleted buyers...');
    const syncResult = await syncService.syncDeletedBuyers(deletedBuyers);
    
    console.log('\n🎉 Deletion sync completed:');
    console.log(`   Total detected: ${syncResult.totalDetected}`);
    console.log(`   Successfully deleted: ${syncResult.successfullyDeleted}`);
    console.log(`   Failed to delete: ${syncResult.failedToDelete}`);
    console.log(`   Requires manual review: ${syncResult.requiresManualReview}`);
    console.log(`   Duration: ${syncResult.durationMs}ms`);
    
    if (syncResult.deletedSellerNumbers.length > 0) {
      console.log(`\n✅ Deleted buyers: ${syncResult.deletedSellerNumbers.join(', ')}`);
    }
    
    if (syncResult.manualReviewSellerNumbers.length > 0) {
      console.log(`\n⚠️  Manual review required: ${syncResult.manualReviewSellerNumbers.join(', ')}`);
    }
    
    if (syncResult.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      syncResult.errors.forEach(err => {
        console.log(`   ${err.sellerNumber}: ${err.error}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error during buyer deletion sync:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBuyerDeletionSync()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
