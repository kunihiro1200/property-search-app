/**
 * 手動でフル同期を1回実行するスクリプト
 * 
 * 使用方法:
 *   npx ts-node run-full-sync-once.ts
 * 
 * このスクリプトは、スプレッドシートにあってDBにない全ての売主を検出し、同期します。
 */
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runFullSyncOnce() {
  console.log('🔄 Starting manual full sync...\n');

  try {
    // サービスをインポート
    const { getEnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    const { getSyncHealthChecker } = await import('./src/services/SyncHealthChecker');

    // サービスを初期化
    const syncService = getEnhancedAutoSyncService();
    console.log('📊 Initializing sync service...');
    await syncService.initialize();
    console.log('✅ Sync service initialized\n');

    // 不足している売主を検出
    console.log('🔍 Detecting missing sellers...');
    const missingSellers = await syncService.detectMissingSellers();
    console.log(`📋 Found ${missingSellers.length} missing sellers\n`);

    if (missingSellers.length === 0) {
      console.log('✅ No missing sellers found. Database is up to date!');
      process.exit(0);
    }

    // 最初の10件を表示
    console.log('Missing seller numbers (first 10):');
    missingSellers.slice(0, 10).forEach((sellerNumber, index) => {
      console.log(`  ${index + 1}. ${sellerNumber}`);
    });
    if (missingSellers.length > 10) {
      console.log(`  ... and ${missingSellers.length - 10} more\n`);
    } else {
      console.log('');
    }

    // フル同期を実行
    console.log('🚀 Starting full sync...');
    const startTime = Date.now();
    const result = await syncService.runFullSync('manual');
    const duration = Date.now() - startTime;

    // 結果を表示
    console.log('\n📊 Sync Results:');
    console.log('─'.repeat(50));
    console.log(`✅ Status: ${result.status}`);
    console.log(`📥 New sellers added: ${result.additionResult.successfullyAdded}`);
    console.log(`🔄 Sellers updated: ${result.additionResult.successfullyUpdated}`);
    console.log(`🗑️  Sellers deleted: ${result.deletionResult.successfullyDeleted}`);
    console.log(`🔍 Missing sellers detected: ${result.additionResult.totalProcessed}`);
    console.log(`❌ Addition errors: ${result.additionResult.failed}`);
    console.log(`❌ Deletion errors: ${result.deletionResult.failedToDelete}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('─'.repeat(50));

    // エラーがあれば表示
    if (result.deletionResult.errors && result.deletionResult.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.deletionResult.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.sellerNumber}: ${error.error}`);
      });
      if (result.deletionResult.errors.length > 5) {
        console.log(`  ... and ${result.deletionResult.errors.length - 5} more errors`);
      }
    }

    // ヘルスチェックを更新
    console.log('\n🏥 Updating health status...');
    const healthChecker = getSyncHealthChecker();
    await healthChecker.checkAndUpdateHealth();
    const health = await healthChecker.getHealthStatus();
    console.log(`✅ Health status: ${health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    const isSuccess = result.status === 'success' || result.status === 'partial_success';
    console.log(`\n${isSuccess ? '✅' : '❌'} Full sync completed!`);
    process.exit(isSuccess ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Full sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプトを実行
runFullSyncOnce();
