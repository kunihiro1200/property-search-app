/**
 * 買主紐づけ検証スクリプト
 * 特定の物件番号（例: AA6381）の買主紐づけを検証
 */

import { BuyerLinkageValidator } from './src/services/BuyerLinkageValidator';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const validator = new BuyerLinkageValidator();

  console.log('=== 買主紐づけ検証 ===\n');

  // テスト対象の物件番号
  const testPropertyNumbers = ['AA6381', 'AA2257', 'AA4801'];

  // 個別検証
  console.log('1. 個別物件の検証:');
  for (const propertyNumber of testPropertyNumbers) {
    console.log(`\n物件番号: ${propertyNumber}`);
    const result = await validator.validateComprehensive(propertyNumber);
    
    console.log(`  ${result.summary}`);
    console.log(`  - データベース買主数: ${result.details.linkage.databaseCount}`);
    console.log(`  - API買主数: ${result.details.linkage.apiCount}`);
    
    if (result.details.linkage.errors.length > 0) {
      console.log(`  - エラー:`);
      result.details.linkage.errors.forEach(err => console.log(`    - ${err}`));
    }
    
    if (!result.dataValid) {
      console.log(`  - データ整合性の問題:`);
      result.details.data.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    if (!result.apiValid) {
      console.log(`  - APIレスポンスの問題:`);
      result.details.api.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  }

  // 一括検証
  console.log('\n\n2. 一括検証:');
  const batchResult = await validator.validateBatch(testPropertyNumbers);
  
  console.log(`  総数: ${batchResult.total}`);
  console.log(`  成功: ${batchResult.passed}`);
  console.log(`  失敗: ${batchResult.failed}`);
  
  if (batchResult.failed > 0) {
    console.log('\n  失敗した物件:');
    batchResult.results
      .filter(r => !r.match)
      .forEach(r => {
        console.log(`    - ${r.propertyNumber}: DB=${r.databaseCount}, API=${r.apiCount}`);
        if (r.errors.length > 0) {
          r.errors.forEach(err => console.log(`      エラー: ${err}`));
        }
      });
  }

  console.log('\n完了');
}

main().catch(console.error);
