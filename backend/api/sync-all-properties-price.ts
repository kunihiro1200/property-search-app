/**
 * 全物件の価格を一括同期
 * 
 * 価格の優先順位:
 * 1. BS列（価格）
 * 2. J列（売買価格）
 */
import { getPropertyListingSyncService } from './src/services/PropertyListingSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/api/.env を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function syncAllPropertiesPrice() {
  console.log('🔄 全物件の価格を一括同期開始...\n');

  try {
    const syncService = getPropertyListingSyncService();
    await syncService.initialize();

    console.log('📋 フル同期を実行（全件処理）...\n');

    let startIndex = 0;
    const batchSize = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(`\n📦 バッチ ${Math.floor(startIndex / batchSize) + 1} を処理中...`);
      
      const result = await syncService.runFullSync('manual', batchSize, startIndex);

      console.log(`\n✅ バッチ ${Math.floor(startIndex / batchSize) + 1} 完了:`);
      console.log(`   - 追加: ${result.successfullyAdded}`);
      console.log(`   - 更新: ${result.successfullyUpdated}`);
      console.log(`   - 失敗: ${result.failed}`);

      if (result.errors.length > 0) {
        console.log('\n❌ エラー:');
        result.errors.forEach(error => {
          console.log(`   - ${error.propertyNumber}: ${error.message}`);
        });
      }

      // 次のバッチへ
      startIndex += batchSize;

      // 処理した件数が0の場合は終了
      if (result.totalProcessed === 0) {
        hasMore = false;
      }

      // 少し待機（API制限対策）
      if (hasMore) {
        console.log('\n⏳ 5秒待機中...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n✅ 全物件の価格同期が完了しました！');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

syncAllPropertiesPrice();
