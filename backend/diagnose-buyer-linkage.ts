// 買主と物件の紐づけ診断スクリプト
import * as dotenv from 'dotenv';
import { BuyerLinkageDiagnostic } from './src/services/BuyerLinkageDiagnostic';

dotenv.config();

async function main() {
  const diagnostic = new BuyerLinkageDiagnostic();

  try {
    const result = await diagnostic.analyzeLinkageStatus();

    console.log('\n=== 診断結果サマリー ===');
    console.log(`総買主数: ${result.totalBuyers}件`);
    console.log(`property_number設定済み: ${result.buyersWithProperty}件 (${((result.buyersWithProperty / result.totalBuyers) * 100).toFixed(2)}%)`);
    console.log(`property_number未設定: ${result.buyersWithoutProperty}件 (${((result.buyersWithoutProperty / result.totalBuyers) * 100).toFixed(2)}%)`);
    console.log(`\n物件番号の種類: ${Object.keys(result.propertyNumberDistribution).length}件`);

    // 特定の物件番号（AA6381）の買主を確認
    console.log('\n=== AA6381の買主を確認 ===');
    const aa6381Buyers = await diagnostic.getBuyersForProperty('AA6381');
    console.log(`AA6381に紐づく買主: ${aa6381Buyers.length}件`);
    if (aa6381Buyers.length > 0) {
      aa6381Buyers.forEach(b => {
        console.log(`  ${b.buyer_number} - ${b.name}`);
      });
    }

    console.log('\n診断完了');
  } catch (error: any) {
    console.error('診断エラー:', error.message);
    process.exit(1);
  }
}

main();
