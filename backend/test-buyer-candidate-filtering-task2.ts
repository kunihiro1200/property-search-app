// タスク2: 最新状況マッチングメソッドの統合テスト
// 実際の物件データ（AA13129）を使用して、タスク1とタスク2の統合動作を確認
import * as dotenv from 'dotenv';
dotenv.config();

import { BuyerCandidateService } from './src/services/BuyerCandidateService';

async function runIntegrationTest() {
  console.log('=== タスク2: 最新状況マッチング統合テスト ===\n');
  console.log('物件番号: AA13129');
  console.log('テスト内容: タスク1（除外条件）とタスク2（最新状況マッチング）の統合動作確認\n');

  const service = new BuyerCandidateService();

  try {
    // AA13129の買主候補を取得
    const result = await service.getCandidatesForProperty('AA13129');

    console.log('=== 物件情報 ===');
    console.log(`物件番号: ${result.property.property_number}`);
    console.log(`物件種別: ${result.property.property_type || '未設定'}`);
    console.log(`販売価格: ${result.property.sales_price ? `${result.property.sales_price.toLocaleString()}円` : '未設定'}`);
    console.log(`配信エリア: ${result.property.distribution_areas || '未設定'}`);
    console.log();

    console.log('=== 買主候補リスト ===');
    console.log(`候補数: ${result.total}件\n`);

    if (result.candidates.length === 0) {
      console.log('候補が見つかりませんでした');
      return;
    }

    // 最新状況と問合せ時確度の分布を確認
    const statusDistribution: { [key: string]: number } = {};
    const confidenceDistribution: { [key: string]: number } = {};

    result.candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.buyer_number} - ${candidate.name || '名前なし'}`);
      console.log(`   最新状況: ${candidate.latest_status || '空欄'}`);
      console.log(`   問合せ時確度: ${candidate.inquiry_confidence || '空欄'}`);
      console.log(`   希望エリア: ${candidate.desired_area || '空欄'}`);
      console.log(`   希望種別: ${candidate.desired_property_type || '空欄'}`);
      console.log(`   受付日: ${candidate.reception_date || '未設定'}`);
      console.log();

      // 分布を集計
      const status = candidate.latest_status || '空欄';
      const confidence = candidate.inquiry_confidence || '空欄';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      confidenceDistribution[confidence] = (confidenceDistribution[confidence] || 0) + 1;
    });

    console.log('=== 最新状況の分布 ===');
    Object.entries(statusDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`${status}: ${count}件`);
      });
    console.log();

    console.log('=== 問合せ時確度の分布 ===');
    Object.entries(confidenceDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([confidence, count]) => {
        console.log(`${confidence}: ${count}件`);
      });
    console.log();

    // 検証: すべての候補が条件を満たしているか確認
    console.log('=== 条件検証 ===');
    let allValid = true;

    result.candidates.forEach((candidate, index) => {
      const status = (candidate.latest_status || '').trim();
      const confidence = (candidate.inquiry_confidence || '').trim();

      // タスク2の条件: 最新状況がA or Bを含む、または最新状況が空欄で問合せ時確度がA or B
      const hasValidStatus = 
        (status && (status.includes('A') || status.includes('B'))) ||
        (!status && (confidence === 'A' || confidence === 'B'));

      if (!hasValidStatus) {
        console.log(`✗ 候補${index + 1}（${candidate.buyer_number}）が条件を満たしていません`);
        console.log(`   最新状況: ${status || '空欄'}, 問合せ時確度: ${confidence || '空欄'}`);
        allValid = false;
      }
    });

    if (allValid) {
      console.log('✓ すべての候補が最新状況/問合せ時確度の条件を満たしています');
    }
    console.log();

    // 統計情報
    console.log('=== 統計情報 ===');
    const withStatusAB = result.candidates.filter(c => {
      const status = (c.latest_status || '').trim();
      return status && (status.includes('A') || status.includes('B'));
    }).length;

    const withConfidenceAB = result.candidates.filter(c => {
      const status = (c.latest_status || '').trim();
      const confidence = (c.inquiry_confidence || '').trim();
      return !status && (confidence === 'A' || confidence === 'B');
    }).length;

    console.log(`最新状況がA or Bを含む: ${withStatusAB}件`);
    console.log(`最新状況が空欄で問合せ時確度がA or B: ${withConfidenceAB}件`);
    console.log(`合計: ${withStatusAB + withConfidenceAB}件`);
    console.log();

    console.log('✓ 統合テストが完了しました');

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
}

runIntegrationTest().catch(console.error);
