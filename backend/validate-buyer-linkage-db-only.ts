/**
 * 買主紐づけ検証スクリプト（データベースのみ）
 * APIサーバーなしでデータベースの整合性を検証
 */

import { BuyerLinkageValidator } from './src/services/BuyerLinkageValidator';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const validator = new BuyerLinkageValidator();

  console.log('=== 買主紐づけ検証（データベースのみ） ===\n');

  // テスト対象の物件番号
  const testPropertyNumbers = ['AA6381', 'AA2257', 'AA4801'];

  console.log('データベースの整合性検証:');
  
  for (const propertyNumber of testPropertyNumbers) {
    console.log(`\n物件番号: ${propertyNumber}`);
    
    // データベースから直接カウント取得
    const linkage = await validator.validateProperty(propertyNumber);
    console.log(`  データベース買主数: ${linkage.databaseCount}`);
    
    // データ整合性検証
    const dataValidation = await validator.validateBuyerData(propertyNumber);
    
    if (dataValidation.valid) {
      console.log(`  ✓ データ整合性: 問題なし`);
    } else {
      console.log(`  ✗ データ整合性: 問題あり`);
      dataValidation.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    // 買主の詳細を表示（最初の3件）
    if (linkage.databaseCount > 0) {
      console.log(`  買主サンプル（最初の3件）:`);
      const sampleBuyers = linkage.buyers.slice(0, 3);
      sampleBuyers.forEach((buyer, index) => {
        console.log(`    ${index + 1}. ${buyer.buyer_number} - ${buyer.name}`);
      });
    }
  }

  console.log('\n完了');
}

main().catch(console.error);
