/**
 * AA376のAPIレスポンスを確認するスクリプト
 */

import fetch from 'node-fetch';

async function main() {
  console.log('=== AA376 APIレスポンス確認 ===\n');

  const response = await fetch('http://localhost:3000/api/sellers/by-number/AA376');
  const data = await response.json();

  console.log('APIレスポンス:');
  console.log(JSON.stringify(data, null, 2));

  if (data.seller) {
    console.log('\n📊 査定関連フィールド:');
    console.log(`  valuationAmount1: ${data.seller.valuationAmount1}`);
    console.log(`  valuationAmount2: ${data.seller.valuationAmount2}`);
    console.log(`  valuationAmount3: ${data.seller.valuationAmount3}`);
    console.log(`  valuationText: ${data.seller.valuationText}`);
    console.log(`  fixedAssetTaxRoadPrice: ${data.seller.fixedAssetTaxRoadPrice}`);
    console.log(`  manualValuationAmount1: ${data.seller.manualValuationAmount1}`);
  }
}

main().catch(console.error);
