import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testPerformanceMetrics() {
  console.log('=== 2025年11月のパフォーマンスメトリクスをテスト（更新版） ===\n');

  const service = new PerformanceMetricsService();

  try {
    // まず、データベースから直接2025年11月のvisit_dateを持つレコードを確認
    console.log('📋 データベース直接確認:');
    const startDate = new Date(2025, 10, 1).toISOString(); // 11月 = month 10
    const endDate = new Date(2025, 10, 30, 23, 59, 59).toISOString();
    
    const { data: visitDateData, error: visitDateError } = await supabase
      .from('sellers')
      .select('seller_number, visit_date, visit_assignee, status')
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)
      .not('confidence', 'in', '("D","ダブり")');

    if (visitDateError) {
      console.error('エラー:', visitDateError);
    } else {
      console.log(`  visit_date が2025年11月で営担が入力されているレコード: ${visitDateData?.length || 0}件`);
      if (visitDateData && visitDateData.length > 0) {
        console.log('\n  サンプル（最初の5件）:');
        visitDateData.slice(0, 5).forEach(row => {
          console.log(`    ${row.seller_number}: visit_date=${row.visit_date}, 営担=${row.visit_assignee}, 状況=${row.status}`);
        });
        
        console.log('\n  すべてのレコード:');
        visitDateData.forEach(row => {
          console.log(`    ${row.seller_number}: ${row.visit_date} | ${row.visit_assignee}`);
        });
      }
    }

    console.log('\n📊 サービス経由のメトリクス:');
    const metrics = await service.calculateMetrics('2025-11');

    console.log(`訪問査定取得数: ${metrics.visitAppraisalCount}件`);
    console.log(`訪問査定取得割合: ${metrics.visitAppraisalRate.toFixed(1)}%`);
    
    console.log('\n専任媒介件数:');
    console.log(`  合計: ${metrics.exclusiveContracts.total.count}件 (${metrics.exclusiveContracts.total.rate.toFixed(1)}%)`);
    console.log(`  期待値: 22件`);
    
    if (metrics.exclusiveContracts.total.count === 22) {
      console.log('  ✅ 期待値と一致しました！');
    } else {
      console.log(`  ⚠️ 期待値と異なります（差分: ${metrics.exclusiveContracts.total.count - 22}件）`);
    }
    
    if (metrics.exclusiveContracts.byRepresentative.length > 0) {
      console.log('\n  営担別:');
      metrics.exclusiveContracts.byRepresentative.forEach(rep => {
        console.log(`    ${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(1)}%)`);
      });
    }

    console.log('\n他決割合（未訪問）:');
    console.log(`  ${metrics.competitorLossUnvisited.count}件 (${metrics.competitorLossUnvisited.rate.toFixed(1)}%)`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testPerformanceMetrics();
