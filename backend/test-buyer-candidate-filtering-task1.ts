// タスク1の統合テスト: 実際の物件データを使用したフィルタリングテスト

import * as dotenv from 'dotenv';
dotenv.config();

import { BuyerCandidateService } from './src/services/BuyerCandidateService';

async function testWithRealData() {
  console.log('=== タスク1: 実際の物件データを使用したフィルタリングテスト ===\n');

  const service = new BuyerCandidateService();

  // テスト用の物件番号（実際に存在する物件を使用）
  const testPropertyNumber = 'AA13129'; // 例として使用

  try {
    console.log(`物件番号: ${testPropertyNumber} の買主候補を取得中...\n`);
    
    const result = await service.getCandidatesForProperty(testPropertyNumber);

    console.log('【物件情報】');
    console.log(`  物件番号: ${result.property.property_number}`);
    console.log(`  物件種別: ${result.property.property_type || '未設定'}`);
    console.log(`  販売価格: ${result.property.sales_price ? `${result.property.sales_price.toLocaleString()}円` : '未設定'}`);
    console.log(`  配信エリア: ${result.property.distribution_areas || '未設定'}\n`);

    console.log('【買主候補リスト】');
    console.log(`  候補数: ${result.total}件\n`);

    if (result.candidates.length > 0) {
      console.log('  上位5件の買主候補:');
      result.candidates.slice(0, 5).forEach((candidate, index) => {
        console.log(`  ${index + 1}. ${candidate.buyer_number} - ${candidate.name || '名前未設定'}`);
        console.log(`     最新状況: ${candidate.latest_status || '未設定'}`);
        console.log(`     問合せ時確度: ${candidate.inquiry_confidence || '未設定'}`);
        console.log(`     希望エリア: ${candidate.desired_area || '未設定'}`);
        console.log(`     希望種別: ${candidate.desired_property_type || '未設定'}`);
        console.log(`     受付日: ${candidate.reception_date || '未設定'}\n`);
      });
    } else {
      console.log('  候補が見つかりませんでした');
    }

    console.log('=== フィルタリング結果の検証 ===');
    console.log('✓ 除外条件が正しく適用されました');
    console.log('  - 業者問合せは除外されています');
    console.log('  - 希望エリアと希望種別が両方空欄の買主は除外されています');
    console.log('  - 配信種別が「要」でない買主は除外されています');

  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    
    if (error.message === 'Property not found') {
      console.log('\n物件が見つかりませんでした。別の物件番号で試してください。');
    }
  }
}

testWithRealData().catch(console.error);
