import { ExclusionDateCalculator } from './src/services/ExclusionDateCalculator';

// テストケース
const today = new Date();
today.setHours(0, 0, 0, 0);

const testCases = [
  {
    name: 'サイト=ウ、今日の反響',
    inquiryDate: new Date(today),
    site: 'ウ',
  },
  {
    name: 'サイト=ウ、3日前の反響',
    inquiryDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
    site: 'ウ',
  },
  {
    name: 'サイト=ウ、7日前の反響',
    inquiryDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    site: 'ウ',
  },
  {
    name: 'サイト=ウ、8日前の反響（範囲外）',
    inquiryDate: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000),
    site: 'ウ',
  },
  {
    name: 'サイト=ウ、反響日付なし',
    inquiryDate: null,
    site: 'ウ',
  },
  {
    name: '反響日付あり、サイトなし',
    inquiryDate: new Date(today),
    site: null,
  },
];

console.log('除外日計算テスト\n');
console.log('今日:', new Date().toISOString().split('T')[0]);
console.log('='.repeat(80));

testCases.forEach((testCase) => {
  const result = ExclusionDateCalculator.calculateExclusionDate(
    testCase.inquiryDate,
    testCase.site
  );
  
  console.log(`\n${testCase.name}`);
  console.log('  反響日付:', testCase.inquiryDate ? testCase.inquiryDate.toISOString().split('T')[0] : 'なし');
  console.log('  サイト:', testCase.site || 'なし');
  console.log('  除外日:', result ? result.toISOString().split('T')[0] : 'なし（条件を満たさない）');
  
  if (result && testCase.inquiryDate) {
    const inquiryNormalized = new Date(testCase.inquiryDate);
    inquiryNormalized.setHours(0, 0, 0, 0);
    const resultNormalized = new Date(result);
    resultNormalized.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor(
      (resultNormalized.getTime() - inquiryNormalized.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log('  計算:', `反響日付 + ${daysDiff}日`);
  }
});

console.log('\n' + '='.repeat(80));
