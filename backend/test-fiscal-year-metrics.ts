/**
 * 年度計算機能の手動テストスクリプト
 * 
 * このスクリプトは以下をテストします：
 * 1. 現在の年度のメトリクス計算
 * 2. 年度の切り替わり時期（9月→10月）のテスト
 * 3. 各月の計算結果の検証
 * 4. 表示フォーマットの確認
 */

import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import { FiscalYearUtils } from './src/utils/FiscalYearUtils';

async function testFiscalYearMetrics() {
  console.log('='.repeat(80));
  console.log('年度計算機能の手動テスト');
  console.log('='.repeat(80));
  console.log();

  const service = new PerformanceMetricsService();

  // テスト1: 現在月のメトリクス計算
  console.log('【テスト1】現在月のメトリクス計算');
  console.log('-'.repeat(80));
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  console.log(`現在月: ${currentMonthStr}`);
  console.log();

  try {
    const currentMetrics = await service.calculateEnhancedMetrics(currentMonthStr);
    
    console.log('訪問査定取得割合:');
    console.log(`  現在値: ${currentMetrics.visitAppraisalRate.currentValue.toFixed(2)}%`);
    console.log(`  年度月平均: ${currentMetrics.visitAppraisalRate.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  目標: ${currentMetrics.visitAppraisalRate.target}%`);
    console.log();

    console.log('専任件数・割合:');
    console.log(`  合計: ${currentMetrics.exclusiveContracts.total.count}件 (${currentMetrics.exclusiveContracts.total.rate.toFixed(2)}%)`);
    console.log(`  年度月平均: ${currentMetrics.exclusiveContracts.total.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  目標: ${currentMetrics.exclusiveContracts.total.target}%`);
    console.log('  担当者別:');
    currentMetrics.exclusiveContracts.byRepresentative.forEach(rep => {
      console.log(`    ${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(2)}%) 月平均: ${rep.fiscalYearMonthlyAverage.toFixed(2)}%`);
    });
    console.log();

    console.log('他決割合（未訪問）:');
    console.log(`  現在値: ${currentMetrics.competitorLossUnvisited.currentValue.toFixed(2)}%`);
    console.log(`  年度月平均: ${currentMetrics.competitorLossUnvisited.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  前年度月平均: ${currentMetrics.competitorLossUnvisited.previousYearMonthlyAverage.toFixed(2)}%`);
    console.log();

    console.log('他決割合（訪問済み）:');
    console.log(`  合計: ${currentMetrics.competitorLossVisited.total.count}件 (${currentMetrics.competitorLossVisited.total.rate.toFixed(2)}%)`);
    console.log(`  年度月平均: ${currentMetrics.competitorLossVisited.total.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  前年度月平均: ${currentMetrics.competitorLossVisited.total.previousYearMonthlyAverage.toFixed(2)}%`);
    console.log('  担当者別:');
    currentMetrics.competitorLossVisited.byRepresentative.forEach(rep => {
      console.log(`    ${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(2)}%) 月平均: ${rep.fiscalYearMonthlyAverage.toFixed(2)}%`);
    });
    console.log();
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }

  // テスト2: 年度の切り替わり時期のテスト
  console.log('【テスト2】年度の切り替わり時期のテスト');
  console.log('-'.repeat(80));
  
  const testMonths = [
    { year: 2024, month: 9, description: '2023年度の最終月（2024年9月）' },
    { year: 2024, month: 10, description: '2024年度の開始月（2024年10月）' },
    { year: 2025, month: 9, description: '2024年度の最終月（2025年9月）' },
    { year: 2025, month: 10, description: '2025年度の開始月（2025年10月）' },
  ];

  for (const testMonth of testMonths) {
    console.log(`\n${testMonth.description}`);
    
    const fiscalPeriod = FiscalYearUtils.getFiscalYearPeriod(new Date(testMonth.year, testMonth.month - 1, 1));
    const monthRange = FiscalYearUtils.getFiscalYearMonthRange(testMonth.year, testMonth.month);
    
    console.log(`  年度: ${fiscalPeriod.fiscalYear}年度`);
    console.log(`  年度期間: ${fiscalPeriod.startDate.toLocaleDateString('ja-JP')} ～ ${fiscalPeriod.endDate.toLocaleDateString('ja-JP')}`);
    console.log(`  経過月数: ${monthRange.monthsElapsed}ヶ月`);
    
    const monthStr = `${testMonth.year}-${String(testMonth.month).padStart(2, '0')}`;
    
    try {
      const metrics = await service.calculateEnhancedMetrics(monthStr);
      console.log(`  訪問査定取得割合: 現在値=${metrics.visitAppraisalRate.currentValue.toFixed(2)}%, 月平均=${metrics.visitAppraisalRate.fiscalYearMonthlyAverage.toFixed(2)}%`);
    } catch (error) {
      console.log(`  メトリクス計算エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log();

  // テスト3: 年度内の各月のテスト
  console.log('【テスト3】年度内の各月のメトリクス計算');
  console.log('-'.repeat(80));
  
  const fiscalPeriod = FiscalYearUtils.getFiscalYearPeriod(now);
  console.log(`現在の年度: ${fiscalPeriod.fiscalYear}年度`);
  console.log(`年度期間: ${fiscalPeriod.startDate.toLocaleDateString('ja-JP')} ～ ${fiscalPeriod.endDate.toLocaleDateString('ja-JP')}`);
  console.log();

  // 年度開始月から現在月までをテスト
  const startYear = fiscalPeriod.startDate.getFullYear();
  const startMonth = fiscalPeriod.startDate.getMonth() + 1;
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  let testYear = startYear;
  let testMonth = startMonth;

  while (testYear < endYear || (testYear === endYear && testMonth <= endMonth)) {
    const monthStr = `${testYear}-${String(testMonth).padStart(2, '0')}`;
    const monthRange = FiscalYearUtils.getFiscalYearMonthRange(testYear, testMonth);
    
    console.log(`${monthStr} (経過月数: ${monthRange.monthsElapsed}ヶ月)`);
    
    try {
      const metrics = await service.calculateEnhancedMetrics(monthStr);
      console.log(`  訪問査定: ${metrics.visitAppraisalRate.currentValue.toFixed(2)}% (月平均: ${metrics.visitAppraisalRate.fiscalYearMonthlyAverage.toFixed(2)}%)`);
      console.log(`  専任割合: ${metrics.exclusiveContracts.total.rate.toFixed(2)}% (月平均: ${metrics.exclusiveContracts.total.fiscalYearMonthlyAverage.toFixed(2)}%)`);
    } catch (error) {
      console.log(`  エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log();

    testMonth++;
    if (testMonth > 12) {
      testMonth = 1;
      testYear++;
    }
  }

  // テスト4: 前年度との比較
  console.log('【テスト4】前年度との比較');
  console.log('-'.repeat(80));
  
  const prevYearRange = FiscalYearUtils.getPreviousFiscalYearRange(currentYear, currentMonth);
  console.log(`前年度同期間: ${prevYearRange.startDate.toLocaleDateString('ja-JP')} ～ ${prevYearRange.endDate.toLocaleDateString('ja-JP')}`);
  console.log();

  try {
    const currentMetrics = await service.calculateEnhancedMetrics(currentMonthStr);
    
    console.log('他決割合（未訪問）の比較:');
    console.log(`  今年度月平均: ${currentMetrics.competitorLossUnvisited.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  前年度月平均: ${currentMetrics.competitorLossUnvisited.previousYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  差分: ${(currentMetrics.competitorLossUnvisited.fiscalYearMonthlyAverage - currentMetrics.competitorLossUnvisited.previousYearMonthlyAverage).toFixed(2)}%`);
    console.log();

    console.log('他決割合（訪問済み）の比較:');
    console.log(`  今年度月平均: ${currentMetrics.competitorLossVisited.total.fiscalYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  前年度月平均: ${currentMetrics.competitorLossVisited.total.previousYearMonthlyAverage.toFixed(2)}%`);
    console.log(`  差分: ${(currentMetrics.competitorLossVisited.total.fiscalYearMonthlyAverage - currentMetrics.competitorLossVisited.total.previousYearMonthlyAverage).toFixed(2)}%`);
    console.log();
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }

  console.log('='.repeat(80));
  console.log('テスト完了');
  console.log('='.repeat(80));
}

// スクリプトを実行
testFiscalYearMetrics()
  .then(() => {
    console.log('\nすべてのテストが完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nテスト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
