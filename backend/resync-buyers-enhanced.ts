// 拡張買主同期サービスを使用して買主データを再同期
import { EnhancedBuyerSyncService } from './src/services/EnhancedBuyerSyncService';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('=== 拡張買主同期サービスによる再同期 ===\n');
  console.log('property_numberの明示的な抽出と検証を実行します...\n');

  const syncService = new EnhancedBuyerSyncService();

  try {
    const result = await syncService.syncWithPropertyValidation();

    console.log('\n=== 同期結果 ===');
    console.log(`実行時間: ${result.duration}ms`);
    console.log(`作成: ${result.created}件`);
    console.log(`更新: ${result.updated}件`);
    console.log(`失敗: ${result.failed}件`);
    console.log(`スキップ: ${result.skipped}件`);
    console.log();
    console.log('=== property_number統計 ===');
    console.log(`抽出成功: ${result.propertyNumberStats.extracted}件`);
    console.log(`検証成功: ${result.propertyNumberStats.validated}件`);
    console.log(`無効: ${result.propertyNumberStats.invalid}件`);
    console.log(`未設定: ${result.propertyNumberStats.missing}件`);

    if (result.errors.length > 0) {
      console.log('\n=== エラー詳細（最初の10件） ===');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`  行${error.row} (${error.buyerNumber || '不明'}): ${error.message}`);
      });
    }

    console.log('\n✓ 同期完了');
  } catch (error: any) {
    console.error('✗ 同期エラー:', error.message);
    process.exit(1);
  }
}

main();
