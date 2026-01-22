import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';

async function testExclusiveContractsFix() {
  try {
    console.log('\n=== 専任媒介契約カウント修正後のテスト ===\n');
    
    const service = new PerformanceMetricsService();
    
    // 2025年11月のメトリクスを計算
    const metrics = await service.calculateMetrics('2025-11');
    
    console.log('=== 2025年11月の専任媒介契約 ===\n');
    console.log(`合計件数: ${metrics.exclusiveContracts.total.count}件`);
    console.log(`合計割合: ${metrics.exclusiveContracts.total.rate.toFixed(2)}%`);
    
    console.log('\n=== 担当者別内訳 ===\n');
    metrics.exclusiveContracts.byRepresentative.forEach((rep, index) => {
      console.log(`${index + 1}. ${rep.representative}`);
      console.log(`   件数: ${rep.count}件`);
      console.log(`   割合: ${rep.rate.toFixed(2)}%`);
      console.log('');
    });
    
    // 担当者Iの件数を確認
    const repI = metrics.exclusiveContracts.byRepresentative.find(r => r.representative === 'I');
    
    console.log('\n=== 検証結果 ===\n');
    console.log(`担当者Iの専任媒介契約: ${repI?.count || 0}件`);
    console.log(`期待値: 3件`);
    
    if (repI?.count === 3) {
      console.log('\n✅ 修正成功！期待値と一致しました。');
    } else {
      console.log(`\n⚠️ 期待値と一致しません（${repI?.count || 0}件 vs 3件）`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testExclusiveContractsFix();
