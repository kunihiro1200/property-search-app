/**
 * 拡張買主同期サービスを使用して買主データを再同期
 * 進捗状況と詳細な統計を表示
 */

import { EnhancedBuyerSyncService } from './src/services/EnhancedBuyerSyncService';
import { BuyerLinkageDiagnostic } from './src/services/BuyerLinkageDiagnostic';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('=== 拡張買主同期サービスによる再同期 ===\n');
  
  // 同期前の状態を診断
  console.log('📊 同期前の状態を確認中...\n');
  const diagnostic = new BuyerLinkageDiagnostic();
  const beforeStats = await diagnostic.analyze();
  
  console.log('同期前の統計:');
  console.log(`  総買主数: ${beforeStats.totalBuyers}件`);
  console.log(`  property_number設定済み: ${beforeStats.buyersWithPropertyNumber}件`);
  console.log(`  property_number未設定: ${beforeStats.buyersWithoutPropertyNumber}件`);
  console.log(`  設定率: ${beforeStats.propertyNumberPercentage.toFixed(1)}%\n`);

  // 同期実行
  console.log('🔄 property_numberの明示的な抽出と検証を実行します...\n');
  const syncService = new EnhancedBuyerSyncService();

  const startTime = Date.now();
  
  try {
    const result = await syncService.syncWithPropertyValidation();
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n=== 同期結果 ===');
    console.log(`⏱️  実行時間: ${duration}秒`);
    console.log(`✅ 作成: ${result.created}件`);
    console.log(`🔄 更新: ${result.updated}件`);
    console.log(`❌ 失敗: ${result.failed}件`);
    console.log(`⏭️  スキップ: ${result.skipped}件`);
    console.log();
    
    console.log('=== property_number統計 ===');
    console.log(`✓ 抽出成功: ${result.propertyNumberStats.extracted}件`);
    console.log(`✓ 検証成功: ${result.propertyNumberStats.validated}件`);
    console.log(`✗ 無効: ${result.propertyNumberStats.invalid}件`);
    console.log(`- 未設定: ${result.propertyNumberStats.missing}件`);

    // 同期後の状態を診断
    console.log('\n📊 同期後の状態を確認中...\n');
    const afterStats = await diagnostic.analyze();
    
    console.log('同期後の統計:');
    console.log(`  総買主数: ${afterStats.totalBuyers}件`);
    console.log(`  property_number設定済み: ${afterStats.buyersWithPropertyNumber}件`);
    console.log(`  property_number未設定: ${afterStats.buyersWithoutPropertyNumber}件`);
    console.log(`  設定率: ${afterStats.propertyNumberPercentage.toFixed(1)}%\n`);

    // 変化を計算
    const buyersDiff = afterStats.totalBuyers - beforeStats.totalBuyers;
    const withPropertyDiff = afterStats.buyersWithPropertyNumber - beforeStats.buyersWithPropertyNumber;
    const percentageDiff = afterStats.propertyNumberPercentage - beforeStats.propertyNumberPercentage;

    console.log('=== 変化 ===');
    console.log(`  総買主数: ${buyersDiff >= 0 ? '+' : ''}${buyersDiff}件`);
    console.log(`  property_number設定済み: ${withPropertyDiff >= 0 ? '+' : ''}${withPropertyDiff}件`);
    console.log(`  設定率: ${percentageDiff >= 0 ? '+' : ''}${percentageDiff.toFixed(1)}%\n`);

    if (result.errors.length > 0) {
      console.log('=== エラー詳細（最初の10件） ===');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`  行${error.row} (${error.buyerNumber || '不明'}): ${error.message}`);
      });
      
      if (result.errors.length > 10) {
        console.log(`  ... 他${result.errors.length - 10}件のエラー\n`);
      }
    }

    // サンプルデータを表示
    if (afterStats.sampleBuyers.length > 0) {
      console.log('=== サンプルデータ（最初の5件） ===');
      afterStats.sampleBuyers.slice(0, 5).forEach((buyer, index) => {
        console.log(`  ${index + 1}. ${buyer.buyer_number} - ${buyer.name}`);
        console.log(`     物件番号: ${buyer.property_number || '(未設定)'}`);
      });
      console.log();
    }

    console.log('✅ 同期完了');
    
    // 成功率を計算
    const totalProcessed = result.created + result.updated + result.failed;
    const successRate = totalProcessed > 0 
      ? ((result.created + result.updated) / totalProcessed * 100).toFixed(1)
      : '0.0';
    console.log(`成功率: ${successRate}%`);

  } catch (error: any) {
    console.error('\n❌ 同期エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
