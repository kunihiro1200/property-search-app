import { ExclusionDateCalculator } from './src/services/ExclusionDateCalculator';

console.log('今日:', new Date().toISOString());

// 2024年12月4日でテスト
const inquiryDate = new Date('2024-12-04');
console.log('\n反響日:', inquiryDate.toISOString());
console.log('反響日（ローカル）:', inquiryDate.toLocaleString('ja-JP'));

const result = ExclusionDateCalculator.calculateExclusionDate(inquiryDate, 'ウ');
console.log('\n除外日:', result?.toISOString());
console.log('除外日（ローカル）:', result?.toLocaleString('ja-JP'));

if (result) {
  const daysDiff = Math.floor(
    (result.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log('日数差:', daysDiff);
} else {
  console.log('除外日が計算されませんでした（範囲外の可能性）');
}

// 詳細デバッグ（UTC版）
console.log('\n--- 詳細デバッグ（UTC版） ---');
const inquiry2 = new Date('2024-12-04');
console.log('元の日付:', inquiry2.toISOString());
console.log('getUTCDate():', inquiry2.getUTCDate());

inquiry2.setUTCHours(0, 0, 0, 0);
console.log('正規化後:', inquiry2.toISOString());
console.log('getUTCDate():', inquiry2.getUTCDate());

const exclusionDate2 = new Date(inquiry2);
console.log('コピー後:', exclusionDate2.toISOString());
console.log('getUTCDate():', exclusionDate2.getUTCDate());

exclusionDate2.setUTCDate(exclusionDate2.getUTCDate() + 7);
console.log('7日加算後:', exclusionDate2.toISOString());
console.log('getUTCDate():', exclusionDate2.getUTCDate());
