import { ExclusionDateCalculator } from './src/services/ExclusionDateCalculator';

// 今日の日付を使用
const today = new Date();
console.log('今日（システム）:', today.toISOString());
console.log('今日（ローカル）:', today.toLocaleString('ja-JP'));

// 今日を反響日としてテスト
const result = ExclusionDateCalculator.calculateExclusionDate(today, 'ウ');
console.log('\n除外日:', result?.toISOString());
console.log('除外日（ローカル）:', result?.toLocaleString('ja-JP'));

if (result) {
  const todayNormalized = new Date(today);
  todayNormalized.setUTCHours(0, 0, 0, 0);
  const resultNormalized = new Date(result);
  resultNormalized.setUTCHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor(
    (resultNormalized.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log('日数差:', daysDiff, '日');
  console.log('期待値: 7日');
  console.log('正しい:', daysDiff === 7 ? '✓' : '✗');
}
