/**
 * 買主の自動同期を実行するスクリプト
 */
import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env.local' });

async function runBuyerAutoSync() {
  console.log('🔄 買主の自動同期を開始...\n');

  try {
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 買主の完全同期を実行
    const result = await syncService.syncBuyers();

    console.log('\n🎉 買主の自動同期が完了しました\n');
    console.log('--- 結果 ---');
    console.log(`不足している買主: ${result.missingBuyers.length}件`);
    console.log(`更新が必要な買主: ${result.updatedBuyers.length}件`);
    console.log('');

    if (result.syncMissingResult) {
      console.log('--- 不足している買主の同期結果 ---');
      console.log(`成功: ${result.syncMissingResult.newSellersCount}件`);
      console.log(`エラー: ${result.syncMissingResult.errors.length}件`);
      if (result.syncMissingResult.errors.length > 0) {
        console.log('エラー詳細:');
        result.syncMissingResult.errors.forEach(error => {
          console.log(`  - ${error.sellerNumber}: ${error.message}`);
        });
      }
      console.log('');
    }

    if (result.syncUpdatedResult) {
      console.log('--- 更新が必要な買主の同期結果 ---');
      console.log(`成功: ${result.syncUpdatedResult.updatedSellersCount}件`);
      console.log(`エラー: ${result.syncUpdatedResult.errors.length}件`);
      if (result.syncUpdatedResult.errors.length > 0) {
        console.log('エラー詳細:');
        result.syncUpdatedResult.errors.forEach(error => {
          console.log(`  - ${error.sellerNumber}: ${error.message}`);
        });
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

runBuyerAutoSync().catch(console.error);
