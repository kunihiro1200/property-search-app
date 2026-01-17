// 買主リスト同期スクリプト
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { BuyerSyncService } from './src/services/BuyerSyncService';

async function main() {
  console.log('=== 買主リスト同期開始 ===');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  const syncService = new BuyerSyncService();

  try {
    const result = await syncService.syncAll();

    console.log('');
    console.log('=== 同期結果 ===');
    console.log(`作成: ${result.created}件`);
    console.log(`更新: ${result.updated}件`);
    console.log(`失敗: ${result.failed}件`);
    console.log(`スキップ: ${result.skipped}件`);
    console.log(`処理時間: ${(result.duration / 1000).toFixed(2)}秒`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('=== エラー詳細 ===');
      result.errors.slice(0, 10).forEach((err) => {
        console.log(`  行${err.row}: ${err.buyerNumber || '不明'} - ${err.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... 他 ${result.errors.length - 10}件のエラー`);
      }
    }

    console.log('');
    console.log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('=== 同期完了 ===');

  } catch (error: any) {
    console.error('同期エラー:', error.message);
    process.exit(1);
  }
}

main();
