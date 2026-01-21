// 検索クエリ検出のテスト

function isPropertyNumber(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }

  const trimmedQuery = query.trim().toUpperCase();
  
  // アルファベット2文字で始まり、その後に数字が続くパターンをチェック
  return /^[A-Z]{2}\d*$/.test(trimmedQuery);
}

// テストケース
const testCases = [
  { input: 'EE2', expected: true, description: 'EE2は物件番号' },
  { input: 'AA123', expected: true, description: 'AA123は物件番号' },
  { input: 'BB456', expected: true, description: 'BB456は物件番号' },
  { input: 'CC789', expected: true, description: 'CC789は物件番号' },
  { input: 'DD012', expected: true, description: 'DD012は物件番号' },
  { input: 'ZZ999', expected: true, description: 'ZZ999は物件番号' },
  { input: '大分市', expected: false, description: '大分市は所在地' },
  { input: '別府市', expected: false, description: '別府市は所在地' },
  { input: 'A123', expected: false, description: 'A123は物件番号ではない（1文字）' },
  { input: 'AAA123', expected: false, description: 'AAA123は物件番号ではない（3文字）' },
  { input: 'AA', expected: true, description: 'AAは物件番号（数字なし）' },
];

console.log('🔍 検索クエリ検出テスト\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase) => {
  const result = isPropertyNumber(testCase.input);
  const status = result === testCase.expected ? '✅' : '❌';
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${testCase.description}`);
  console.log(`   入力: "${testCase.input}" → 結果: ${result ? '物件番号' : '所在地'} (期待: ${testCase.expected ? '物件番号' : '所在地'})\n`);
});

console.log(`\n📊 結果: ${passed}/${testCases.length} 成功, ${failed}/${testCases.length} 失敗`);
