/**
 * Task 3: 希望種別マッチングメソッドの単体テスト
 * 
 * テスト対象: matchesPropertyTypeCriteria() メソッド
 * 
 * テストケース:
 * 1. 希望種別が「指定なし」の場合 → マッチする
 * 2. 希望種別が空欄の場合 → マッチしない（除外）
 * 3. 希望種別が物件種別と一致する場合 → マッチする
 * 4. 希望種別が物件種別と一致しない場合 → マッチしない
 * 5. 希望種別が「戸建」で物件種別が「中古戸建」の場合 → マッチする
 * 6. 希望種別が「マンション」で物件種別が「中古マンション」の場合 → マッチする
 * 7. 希望種別が「土地」で物件種別が「戸建」の場合 → マッチしない
 * 8. 物件種別が空欄の場合 → マッチしない
 */

import * as dotenv from 'dotenv';
import { BuyerCandidateService } from './src/services/BuyerCandidateService';

// 環境変数を読み込む
dotenv.config();

// BuyerCandidateServiceのprivateメソッドにアクセスするための型拡張
class TestBuyerCandidateService extends BuyerCandidateService {
  public testMatchesPropertyTypeCriteria(buyer: any, propertyType: string | null): boolean {
    return (this as any).matchesPropertyTypeCriteria(buyer, propertyType);
  }
}

async function runTests() {
  const service = new TestBuyerCandidateService();
  let passedTests = 0;
  let failedTests = 0;

  console.log('='.repeat(80));
  console.log('Task 3: 希望種別マッチングメソッドの単体テスト');
  console.log('='.repeat(80));
  console.log();

  // テスト1: 希望種別が「指定なし」の場合 → マッチする
  console.log('テスト1: 希望種別が「指定なし」の場合');
  try {
    const buyer = { desired_property_type: '指定なし' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === true) {
      console.log('✓ PASS: 希望種別が「指定なし」の場合、マッチする');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が「指定なし」の場合、マッチするべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト2: 希望種別が空欄の場合 → マッチしない（除外）
  console.log('テスト2: 希望種別が空欄の場合');
  try {
    const buyer = { desired_property_type: '' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === false) {
      console.log('✓ PASS: 希望種別が空欄の場合、マッチしない（除外）');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が空欄の場合、マッチしないべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト3: 希望種別がnullの場合 → マッチしない（除外）
  console.log('テスト3: 希望種別がnullの場合');
  try {
    const buyer = { desired_property_type: null };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === false) {
      console.log('✓ PASS: 希望種別がnullの場合、マッチしない（除外）');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別がnullの場合、マッチしないべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト4: 希望種別が物件種別と完全一致する場合 → マッチする
  console.log('テスト4: 希望種別が物件種別と完全一致する場合');
  try {
    const buyer = { desired_property_type: '中古戸建' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === true) {
      console.log('✓ PASS: 希望種別が物件種別と完全一致する場合、マッチする');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が物件種別と完全一致する場合、マッチするべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト5: 希望種別が「戸建」で物件種別が「中古戸建」の場合 → マッチする
  console.log('テスト5: 希望種別が「戸建」で物件種別が「中古戸建」の場合');
  try {
    const buyer = { desired_property_type: '戸建' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === true) {
      console.log('✓ PASS: 希望種別が「戸建」で物件種別が「中古戸建」の場合、マッチする');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が「戸建」で物件種別が「中古戸建」の場合、マッチするべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト6: 希望種別が「マンション」で物件種別が「中古マンション」の場合 → マッチする
  console.log('テスト6: 希望種別が「マンション」で物件種別が「中古マンション」の場合');
  try {
    const buyer = { desired_property_type: 'マンション' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古マンション');
    if (result === true) {
      console.log('✓ PASS: 希望種別が「マンション」で物件種別が「中古マンション」の場合、マッチする');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が「マンション」で物件種別が「中古マンション」の場合、マッチするべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト7: 希望種別が「土地」で物件種別が「戸建」の場合 → マッチしない
  console.log('テスト7: 希望種別が「土地」で物件種別が「戸建」の場合');
  try {
    const buyer = { desired_property_type: '土地' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, '中古戸建');
    if (result === false) {
      console.log('✓ PASS: 希望種別が「土地」で物件種別が「戸建」の場合、マッチしない');
      passedTests++;
    } else {
      console.log('✗ FAIL: 希望種別が「土地」で物件種別が「戸建」の場合、マッチしないべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト8: 物件種別が空欄の場合 → マッチしない
  console.log('テスト8: 物件種別が空欄の場合');
  try {
    const buyer = { desired_property_type: '戸建' };
    const result = service.testMatchesPropertyTypeCriteria(buyer, null);
    if (result === false) {
      console.log('✓ PASS: 物件種別が空欄の場合、マッチしない');
      passedTests++;
    } else {
      console.log('✗ FAIL: 物件種別が空欄の場合、マッチしないべき');
      failedTests++;
    }
  } catch (error) {
    console.log('✗ FAIL: エラーが発生しました:', error);
    failedTests++;
  }
  console.log();

  // テスト結果のサマリー
  console.log('='.repeat(80));
  console.log('テスト結果サマリー');
  console.log('='.repeat(80));
  console.log(`合計テスト数: ${passedTests + failedTests}`);
  console.log(`成功: ${passedTests}`);
  console.log(`失敗: ${failedTests}`);
  console.log(`成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log();

  if (failedTests === 0) {
    console.log('✓ すべてのテストが成功しました！');
  } else {
    console.log('✗ 一部のテストが失敗しました。');
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
