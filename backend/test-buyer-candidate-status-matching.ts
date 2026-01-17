// タスク2: 最新状況マッチングメソッドのテスト
import * as dotenv from 'dotenv';
dotenv.config();

import { BuyerCandidateService } from './src/services/BuyerCandidateService';

interface TestBuyer {
  id: string;
  buyer_number: string;
  name: string;
  latest_status: string | null;
  inquiry_confidence: string | null;
  inquiry_source: string;
  distribution_type: string;
  broker_inquiry: string | null;
  desired_area: string;
  desired_property_type: string;
  price_range_house: string | null;
  price_range_apartment: string | null;
  price_range_land: string | null;
  reception_date: string;
  email: string;
  phone_number: string;
}

// BuyerCandidateServiceのprivateメソッドにアクセスするための型拡張
class TestableBuyerCandidateService extends BuyerCandidateService {
  public testMatchesStatus(buyer: any): boolean {
    return (this as any).matchesStatus(buyer);
  }
}

async function runTests() {
  console.log('=== タスク2: 最新状況マッチングメソッドのテスト ===\n');

  const service = new TestableBuyerCandidateService();
  let passedTests = 0;
  let totalTests = 0;

  // テストケース1: 最新状況が「A」を含む場合
  totalTests++;
  console.log('テスト1: 最新状況が「A」を含む場合');
  const buyer1: TestBuyer = {
    id: '1',
    buyer_number: 'B001',
    name: '山田太郎',
    latest_status: 'A',
    inquiry_confidence: 'C',
    inquiry_source: 'ネット',
    distribution_type: '要',
    broker_inquiry: null,
    desired_area: '①',
    desired_property_type: '戸建',
    price_range_house: '1000万円〜2000万円',
    price_range_apartment: null,
    price_range_land: null,
    reception_date: '2025-01-01',
    email: 'test1@example.com',
    phone_number: '090-1234-5678',
  };
  const result1 = service.testMatchesStatus(buyer1);
  if (result1 === true) {
    console.log('✓ 成功: 最新状況が「A」の買主がマッチしました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が「A」の買主がマッチしませんでした\n');
  }

  // テストケース2: 最新状況が「B」を含む場合
  totalTests++;
  console.log('テスト2: 最新状況が「B」を含む場合');
  const buyer2: TestBuyer = {
    ...buyer1,
    id: '2',
    buyer_number: 'B002',
    latest_status: 'B',
    inquiry_confidence: 'C',
  };
  const result2 = service.testMatchesStatus(buyer2);
  if (result2 === true) {
    console.log('✓ 成功: 最新状況が「B」の買主がマッチしました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が「B」の買主がマッチしませんでした\n');
  }

  // テストケース3: 最新状況が「AB」を含む場合
  totalTests++;
  console.log('テスト3: 最新状況が「AB」を含む場合');
  const buyer3: TestBuyer = {
    ...buyer1,
    id: '3',
    buyer_number: 'B003',
    latest_status: 'AB',
    inquiry_confidence: 'C',
  };
  const result3 = service.testMatchesStatus(buyer3);
  if (result3 === true) {
    console.log('✓ 成功: 最新状況が「AB」の買主がマッチしました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が「AB」の買主がマッチしませんでした\n');
  }

  // テストケース4: 最新状況が空欄で問合せ時確度が「A」の場合
  totalTests++;
  console.log('テスト4: 最新状況が空欄で問合せ時確度が「A」の場合');
  const buyer4: TestBuyer = {
    ...buyer1,
    id: '4',
    buyer_number: 'B004',
    latest_status: null,
    inquiry_confidence: 'A',
  };
  const result4 = service.testMatchesStatus(buyer4);
  if (result4 === true) {
    console.log('✓ 成功: 最新状況が空欄で問合せ時確度が「A」の買主がマッチしました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が空欄で問合せ時確度が「A」の買主がマッチしませんでした\n');
  }

  // テストケース5: 最新状況が空欄で問合せ時確度が「B」の場合
  totalTests++;
  console.log('テスト5: 最新状況が空欄で問合せ時確度が「B」の場合');
  const buyer5: TestBuyer = {
    ...buyer1,
    id: '5',
    buyer_number: 'B005',
    latest_status: null,
    inquiry_confidence: 'B',
  };
  const result5 = service.testMatchesStatus(buyer5);
  if (result5 === true) {
    console.log('✓ 成功: 最新状況が空欄で問合せ時確度が「B」の買主がマッチしました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が空欄で問合せ時確度が「B」の買主がマッチしませんでした\n');
  }

  // テストケース6: 最新状況が「C」で問合せ時確度が「C」の場合（マッチしない）
  totalTests++;
  console.log('テスト6: 最新状況が「C」で問合せ時確度が「C」の場合（マッチしない）');
  const buyer6: TestBuyer = {
    ...buyer1,
    id: '6',
    buyer_number: 'B006',
    latest_status: 'C',
    inquiry_confidence: 'C',
  };
  const result6 = service.testMatchesStatus(buyer6);
  if (result6 === false) {
    console.log('✓ 成功: 最新状況が「C」で問合せ時確度が「C」の買主が除外されました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が「C」で問合せ時確度が「C」の買主がマッチしてしまいました\n');
  }

  // テストケース7: 最新状況が空欄で問合せ時確度が「C」の場合（マッチしない）
  totalTests++;
  console.log('テスト7: 最新状況が空欄で問合せ時確度が「C」の場合（マッチしない）');
  const buyer7: TestBuyer = {
    ...buyer1,
    id: '7',
    buyer_number: 'B007',
    latest_status: null,
    inquiry_confidence: 'C',
  };
  const result7 = service.testMatchesStatus(buyer7);
  if (result7 === false) {
    console.log('✓ 成功: 最新状況が空欄で問合せ時確度が「C」の買主が除外されました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況が空欄で問合せ時確度が「C」の買主がマッチしてしまいました\n');
  }

  // テストケース8: 最新状況が空欄で問合せ時確度も空欄の場合（マッチしない）
  totalTests++;
  console.log('テスト8: 最新状況が空欄で問合せ時確度も空欄の場合（マッチしない）');
  const buyer8: TestBuyer = {
    ...buyer1,
    id: '8',
    buyer_number: 'B008',
    latest_status: null,
    inquiry_confidence: null,
  };
  const result8 = service.testMatchesStatus(buyer8);
  if (result8 === false) {
    console.log('✓ 成功: 最新状況と問合せ時確度が両方空欄の買主が除外されました\n');
    passedTests++;
  } else {
    console.log('✗ 失敗: 最新状況と問合せ時確度が両方空欄の買主がマッチしてしまいました\n');
  }

  // 結果サマリー
  console.log('=== テスト結果サマリー ===');
  console.log(`合計: ${totalTests}件`);
  console.log(`成功: ${passedTests}件`);
  console.log(`失敗: ${totalTests - passedTests}件`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n✓ すべてのテストが成功しました！');
  } else {
    console.log('\n✗ 一部のテストが失敗しました');
  }
}

runTests().catch(console.error);
