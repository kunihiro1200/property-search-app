// タスク1の実装テスト: 除外条件メソッドの動作確認

import * as dotenv from 'dotenv';
dotenv.config();

import { BuyerCandidateService } from './src/services/BuyerCandidateService';

async function testExclusionMethods() {
  console.log('=== タスク1: 除外条件メソッドのテスト ===\n');

  const service = new BuyerCandidateService();

  // テストケース1: 業者問合せの除外
  console.log('【テスト1】業者問合せの除外');
  const businessInquiryBuyer = {
    broker_inquiry: 'true',
    desired_area: '①②',
    desired_property_type: '戸建',
    distribution_type: '要',
  };
  // @ts-ignore - private メソッドのテスト
  const result1 = service.shouldExcludeBuyer(businessInquiryBuyer);
  console.log(`  業者問合せフラグ=true → 除外: ${result1 ? '✓' : '✗'}`);
  console.log(`  期待値: true, 実際: ${result1}\n`);

  // テストケース2: 希望エリアと希望種別が両方空欄
  console.log('【テスト2】希望エリアと希望種別が両方空欄');
  const noMinimumCriteriaBuyer = {
    broker_inquiry: null,
    desired_area: '',
    desired_property_type: '',
    distribution_type: '要',
  };
  // @ts-ignore
  const result2 = service.shouldExcludeBuyer(noMinimumCriteriaBuyer);
  console.log(`  希望エリア=空欄 AND 希望種別=空欄 → 除外: ${result2 ? '✓' : '✗'}`);
  console.log(`  期待値: true, 実際: ${result2}\n`);

  // テストケース3: 配信種別が「要」でない
  console.log('【テスト3】配信種別が「要」でない');
  const noDistributionBuyer = {
    broker_inquiry: null,
    desired_area: '①②',
    desired_property_type: '戸建',
    distribution_type: '不要',
  };
  // @ts-ignore
  const result3 = service.shouldExcludeBuyer(noDistributionBuyer);
  console.log(`  配信種別=不要 → 除外: ${result3 ? '✓' : '✗'}`);
  console.log(`  期待値: true, 実際: ${result3}\n`);

  // テストケース4: すべての条件を満たす（除外されない）
  console.log('【テスト4】すべての条件を満たす（除外されない）');
  const validBuyer = {
    broker_inquiry: null,
    desired_area: '①②',
    desired_property_type: '戸建',
    distribution_type: '要',
  };
  // @ts-ignore
  const result4 = service.shouldExcludeBuyer(validBuyer);
  console.log(`  すべての条件を満たす → 除外しない: ${!result4 ? '✓' : '✗'}`);
  console.log(`  期待値: false, 実際: ${result4}\n`);

  // テストケース5: 希望エリアのみ入力（希望種別は空欄）
  console.log('【テスト5】希望エリアのみ入力（希望種別は空欄）');
  const areaOnlyBuyer = {
    broker_inquiry: null,
    desired_area: '①②',
    desired_property_type: '',
    distribution_type: '要',
  };
  // @ts-ignore
  const result5 = service.shouldExcludeBuyer(areaOnlyBuyer);
  console.log(`  希望エリア=①② AND 希望種別=空欄 → 除外しない: ${!result5 ? '✓' : '✗'}`);
  console.log(`  期待値: false, 実際: ${result5}\n`);

  // テストケース6: 希望種別のみ入力（希望エリアは空欄）
  console.log('【テスト6】希望種別のみ入力（希望エリアは空欄）');
  const typeOnlyBuyer = {
    broker_inquiry: null,
    desired_area: '',
    desired_property_type: '戸建',
    distribution_type: '要',
  };
  // @ts-ignore
  const result6 = service.shouldExcludeBuyer(typeOnlyBuyer);
  console.log(`  希望エリア=空欄 AND 希望種別=戸建 → 除外しない: ${!result6 ? '✓' : '✗'}`);
  console.log(`  期待値: false, 実際: ${result6}\n`);

  // サマリー
  console.log('=== テスト結果サマリー ===');
  const allPassed = 
    result1 === true &&
    result2 === true &&
    result3 === true &&
    result4 === false &&
    result5 === false &&
    result6 === false;
  
  if (allPassed) {
    console.log('✓ すべてのテストが成功しました！');
  } else {
    console.log('✗ 一部のテストが失敗しました');
  }
}

testExclusionMethods().catch(console.error);
