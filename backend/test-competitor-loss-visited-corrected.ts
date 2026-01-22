import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';

/**
 * 修正された他決割合（訪問済み）の計算をテスト
 * 
 * 修正された計算式:
 * 分子: 「契約年月 他決は分かった時点」が指定月 かつ 「状況(当社)」に"他決"を含む件数
 * 分母: (その月の該当の「営担」の数 - その「契約年月 他決は分かった時点」に該当する「状況(当社)」が"一般媒介"の数)
 * 
 * 例: 2025年11月の営担 I の場合
 * 分子: 2件（他決の件数）
 * 分母: 12 - 1 = 11件（営担Iの総件数 - 一般媒介の件数）
 * 結果: 2 ÷ 11 ≈ 18.2%
 */
async function testCompetitorLossVisitedCorrected() {
  console.log('=== 修正された他決割合（訪問済み）の計算テスト ===\n');

  const service = new PerformanceMetricsService();

  try {
    // 2025年11月のメトリクスを計算
    const metrics = await service.calculateMetrics('2025-11');

    console.log('📊 2025年11月の他決割合（訪問済み）:');
    console.log('─────────────────────────────────────\n');

    // 営担別の結果を表示
    console.log('営担別の結果:');
    metrics.competitorLossVisited.byRepresentative.forEach(rep => {
      console.log(`  ${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(1)}%)`);
    });

    console.log('\n合計:');
    console.log(`  ${metrics.competitorLossVisited.total.count}件 (${metrics.competitorLossVisited.total.rate.toFixed(1)}%)`);

    // 営担 I の結果を確認
    console.log('\n─────────────────────────────────────');
    console.log('✅ 営担 I の検証:');
    const assigneeI = metrics.competitorLossVisited.byRepresentative.find(
      rep => rep.representative === 'I'
    );

    if (assigneeI) {
      console.log(`  他決件数（分子）: ${assigneeI.count}件`);
      console.log(`  他決割合: ${assigneeI.rate.toFixed(1)}%`);
      
      // 期待値: 2 ÷ 11 ≈ 18.2%
      const expectedRate = (2 / 11) * 100;
      console.log(`  期待値: ${expectedRate.toFixed(1)}%`);
      
      if (Math.abs(assigneeI.rate - expectedRate) < 0.1) {
        console.log('  ✅ 計算結果が期待値と一致しています');
      } else {
        console.log('  ⚠️ 計算結果が期待値と異なります');
      }
    } else {
      console.log('  ⚠️ 営担 I のデータが見つかりませんでした');
    }

    // 営担 U の検証
    console.log('\n✅ 営担 U の検証:');
    const assigneeU = metrics.competitorLossVisited.byRepresentative.find(
      rep => rep.representative === 'U'
    );

    if (assigneeU) {
      console.log(`  他決件数（分子）: ${assigneeU.count}件`);
      console.log(`  他決割合: ${assigneeU.rate.toFixed(1)}%`);
      
      // 期待値: 1 ÷ 8 ≈ 12.5%
      const expectedRate = (1 / 8) * 100;
      console.log(`  期待値: ${expectedRate.toFixed(1)}%`);
      
      if (Math.abs(assigneeU.rate - expectedRate) < 0.1) {
        console.log('  ✅ 計算結果が期待値と一致しています');
      } else {
        console.log('  ⚠️ 計算結果が期待値と異なります');
      }
    } else {
      console.log('  ⚠️ 営担 U のデータが見つかりませんでした');
    }

    console.log('\n=== テスト完了 ===');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプトを実行
testCompetitorLossVisitedCorrected()
  .then(() => {
    console.log('\n✅ すべてのテストが完了しました');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ テストが失敗しました:', error);
    process.exit(1);
  });
