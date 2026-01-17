/**
 * 業務依頼スプレッドシート同期スクリプト
 * 
 * 使用方法:
 *   npx ts-node sync-work-tasks.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { WorkTaskSyncService } from './src/services/WorkTaskSyncService';

async function main() {
  console.log('=== 業務依頼スプレッドシート同期 ===\n');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  const syncService = new WorkTaskSyncService();

  try {
    const result = await syncService.syncAll();

    console.log('\n=== 同期結果 ===');
    console.log(`総行数: ${result.totalRows}`);
    console.log(`成功: ${result.successCount}`);
    console.log(`エラー: ${result.errorCount}`);
    console.log(`開始時刻: ${result.startTime.toLocaleString('ja-JP')}`);
    console.log(`終了時刻: ${result.endTime.toLocaleString('ja-JP')}`);
    console.log(`処理時間: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}秒`);

    if (result.errors.length > 0) {
      console.log('\n=== エラー詳細 ===');
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  行${err.rowNumber}: ${err.propertyNumber || '(物件番号なし)'} - ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... 他 ${result.errors.length - 10} 件のエラー`);
      }
    }

    console.log('\n✅ 同期完了');
  } catch (error: any) {
    console.error('\n❌ 同期エラー:', error.message);
    process.exit(1);
  }
}

main();
