/**
 * 不足売主フル同期スクリプト
 * 
 * スプレッドシートにあってDBにない全ての売主を同期します。
 * 全件比較方式で確実に不足データを検出・同期します。
 * 
 * 使用方法:
 *   npx ts-node sync-missing-sellers-full.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import { getSyncLogService } from './src/services/SyncLogService';
import { getSyncHealthChecker } from './src/services/SyncHealthChecker';

async function main() {
  console.log('='.repeat(60));
  console.log('🔄 不足売主フル同期スクリプト');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. 不足売主を検出
    console.log('📊 Step 1: 不足売主を検出中...');
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    
    const missingSellers = await syncService.detectMissingSellers();
    
    console.log(`   検出された不足売主: ${missingSellers.length}件`);
    
    if (missingSellers.length === 0) {
      console.log('');
      console.log('✅ 不足売主はありません。全てのデータが同期されています。');
      return;
    }

    console.log(`   売主番号: ${missingSellers.slice(0, 10).join(', ')}${missingSellers.length > 10 ? '...' : ''}`);
    console.log('');

    // 2. 同期を実行
    console.log('📊 Step 2: 同期を実行中...');
    const result = await syncService.runFullSync('manual');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 同期結果');
    console.log('='.repeat(60));
    console.log(`   成功: ${result.success ? 'はい' : 'いいえ'}`);
    console.log(`   新規同期: ${result.newSellersCount}件`);
    console.log(`   検出された不足: ${result.missingSellersDetected}件`);
    console.log(`   エラー: ${result.errors.length}件`);
    console.log(`   所要時間: ${result.endTime.getTime() - result.startTime.getTime()}ms`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ エラー詳細:');
      for (const error of result.errors.slice(0, 10)) {
        console.log(`   - ${error.sellerNumber}: ${error.message}`);
      }
      if (result.errors.length > 10) {
        console.log(`   ... 他 ${result.errors.length - 10}件`);
      }
    }

    // 3. ログを記録
    console.log('');
    console.log('📊 Step 3: ログを記録中...');
    const syncLogService = getSyncLogService();
    await syncLogService.logSync(result);
    console.log('   ✅ ログを記録しました');

    // 4. ヘルスチェックを更新
    console.log('');
    console.log('📊 Step 4: ヘルスチェックを更新中...');
    const healthChecker = getSyncHealthChecker();
    await healthChecker.checkAndUpdateHealth();
    
    const health = await healthChecker.getHealthStatus();
    console.log(`   ヘルス状態: ${health.isHealthy ? '✅ 正常' : '⚠️ 異常'}`);
    console.log(`   残りの不足売主: ${health.pendingMissingSellers}件`);

    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 フル同期が完了しました');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('');
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
