/**
 * InquiryHearingParserの動作確認テスト
 */

import { InquiryHearingParser } from './src/services/InquiryHearingParser';

async function testParser() {
  const parser = new InquiryHearingParser();

  console.log('=== InquiryHearingParser 動作確認テスト ===\n');

  // テストケース1: 希望時期
  console.log('テストケース1: 希望時期');
  const test1 = parser.parseInquiryHearing('希望時期：2年以内');
  console.log('入力: 希望時期：2年以内');
  console.log('結果:', test1);
  console.log('期待値: { desired_timing: "2年以内" }');
  console.log('✅ 成功:', test1.desired_timing === '2年以内');
  console.log('');

  // テストケース2: 駐車場希望台数
  console.log('テストケース2: 駐車場希望台数');
  const test2 = parser.parseInquiryHearing('駐車場希望台数：2台');
  console.log('入力: 駐車場希望台数：2台');
  console.log('結果:', test2);
  console.log('期待値: { parking_spaces: "2台" }');
  console.log('✅ 成功:', test2.parking_spaces === '2台');
  console.log('');

  // テストケース3: 予算（通常）
  console.log('テストケース3: 予算（通常）');
  const test3 = parser.parseInquiryHearing('予算：3000万円');
  console.log('入力: 予算：3000万円');
  console.log('結果:', test3);
  console.log('期待値: { desired_price_range: "3000万円台" }');
  console.log('✅ 成功:', test3.desired_price_range === '3000万円台');
  console.log('');

  // テストケース4: 予算（以下）
  console.log('テストケース4: 予算（以下）');
  const test4 = parser.parseInquiryHearing('予算：3000万円以下');
  console.log('入力: 予算：3000万円以下');
  console.log('結果:', test4);
  console.log('期待値: { desired_price_range: "3000万円以下" }');
  console.log('✅ 成功:', test4.desired_price_range === '3000万円以下');
  console.log('');

  // テストケース5: 予算（以上）
  console.log('テストケース5: 予算（以上）');
  const test5 = parser.parseInquiryHearing('予算：5000万円以上');
  console.log('入力: 予算：5000万円以上');
  console.log('結果:', test5);
  console.log('期待値: { desired_price_range: "5000万円以上" }');
  console.log('✅ 成功:', test5.desired_price_range === '5000万円以上');
  console.log('');

  // テストケース6: 複数フィールド
  console.log('テストケース6: 複数フィールド');
  const test6 = parser.parseInquiryHearing(`希望時期：2年以内
駐車場希望台数：2台
予算：3000万円`);
  console.log('入力: 希望時期：2年以内\\n駐車場希望台数：2台\\n予算：3000万円');
  console.log('結果:', test6);
  console.log('期待値: { desired_timing: "2年以内", parking_spaces: "2台", desired_price_range: "3000万円台" }');
  console.log('✅ 成功:', 
    test6.desired_timing === '2年以内' && 
    test6.parking_spaces === '2台' && 
    test6.desired_price_range === '3000万円台'
  );
  console.log('');

  // テストケース7: 上書きルール（現在の値がnull）
  console.log('テストケース7: 上書きルール（現在の値がnull）');
  const shouldOverwrite1 = parser.shouldOverwrite(
    'desired_timing',
    null,
    null,
    new Date()
  );
  console.log('現在の値: null, 現在の更新日時: null');
  console.log('結果:', shouldOverwrite1);
  console.log('期待値: true');
  console.log('✅ 成功:', shouldOverwrite1 === true);
  console.log('');

  // テストケース8: 上書きルール（問合せ時ヒアリングが新しい）
  console.log('テストケース8: 上書きルール（問合せ時ヒアリングが新しい）');
  const oldDate = new Date('2026-02-10T10:00:00Z');
  const newDate = new Date('2026-02-11T10:00:00Z');
  const shouldOverwrite2 = parser.shouldOverwrite(
    'desired_timing',
    '1年以内',
    oldDate,
    newDate
  );
  console.log('現在の値: "1年以内", 現在の更新日時: 2026-02-10, 問合せ時ヒアリング更新日時: 2026-02-11');
  console.log('結果:', shouldOverwrite2);
  console.log('期待値: true');
  console.log('✅ 成功:', shouldOverwrite2 === true);
  console.log('');

  // テストケース9: 上書きルール（希望条件が新しい）
  console.log('テストケース9: 上書きルール（希望条件が新しい）');
  const shouldOverwrite3 = parser.shouldOverwrite(
    'desired_timing',
    '1年以内',
    newDate,
    oldDate
  );
  console.log('現在の値: "1年以内", 現在の更新日時: 2026-02-11, 問合せ時ヒアリング更新日時: 2026-02-10');
  console.log('結果:', shouldOverwrite3);
  console.log('期待値: false');
  console.log('✅ 成功:', shouldOverwrite3 === false);
  console.log('');

  console.log('=== テスト完了 ===');
}

testParser().catch(console.error);
