import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

function testDateParsing() {
  console.log('=== 日付パース修正のテスト ===\n');

  const mapper = new BuyerColumnMapper();
  
  // テストケース
  const testCases = [
    { input: '2024/9/10', expected: '2024-09-10', description: 'YYYY/MM/DD形式' },
    { input: '2024-09-10', expected: '2024-09-10', description: 'YYYY-MM-DD形式' },
    { input: '9/10/2024', expected: '2024-09-10', description: 'MM/DD/YYYY形式' },
    { input: '12/20', expected: '2025-12-20', description: 'MM/DD形式（年省略）' },
    { input: '1/5', expected: '2025-01-05', description: 'M/D形式（年省略）' },
    { input: '', expected: null, description: '空文字' },
    { input: null, expected: null, description: 'null' },
  ];

  testCases.forEach(testCase => {
    // Use reflection to access private method
    const result = (mapper as any).parseDate(testCase.input);
    const status = result === testCase.expected ? '✅' : '❌';
    
    console.log(`${status} ${testCase.description}`);
    console.log(`   入力: "${testCase.input}"`);
    console.log(`   期待: ${testCase.expected}`);
    console.log(`   結果: ${result}`);
    console.log();
  });

  console.log('=== テスト完了 ===');
}

testDateParsing();
