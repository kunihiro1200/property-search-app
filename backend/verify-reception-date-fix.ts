// 受付日修正の検証スクリプト
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

async function main() {
  console.log('=== 受付日パース機能の検証 ===\n');

  const mapper = new BuyerColumnMapper();

  // テストケース
  const testCases = [
    { input: '2024/9/10', expected: '2024-09-10', description: 'YYYY/MM/DD形式' },
    { input: '2024-09-10', expected: '2024-09-10', description: 'YYYY-MM-DD形式' },
    { input: '9/10/2024', expected: '2024-09-10', description: 'MM/DD/YYYY形式' },
    { input: '12/20', expected: '2025-12-20', description: 'MM/DD形式（年省略）' },
    { input: '1/5', expected: '2025-01-05', description: 'M/D形式（年省略）' },
    { input: '2025/12/20', expected: '2025-12-20', description: '買主6647の実データ' },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    // @ts-ignore - accessing private method for testing
    const result = mapper['parseDate'](testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
    console.log(`   入力: "${testCase.input}"`);
    console.log(`   期待: "${testCase.expected}"`);
    console.log(`   結果: "${result}"`);
    console.log('');

    if (!passed) {
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('✅ 全てのテストケースが成功しました！');
    console.log('\n次のステップ:');
    console.log('1. 全買主データを再同期してください:');
    console.log('   cd backend');
    console.log('   npx ts-node sync-buyers.ts');
    console.log('');
    console.log('2. ブラウザで確認してください:');
    console.log('   http://localhost:5173/buyers');
  } else {
    console.log('❌ 一部のテストケースが失敗しました。');
    process.exit(1);
  }
}

main();
