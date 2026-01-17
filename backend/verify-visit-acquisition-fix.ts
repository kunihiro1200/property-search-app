import { createClient } from '@supabase/supabase-js';
import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyFix() {
  console.log('=== 訪問査定取得数の修正を検証 ===\n');

  try {
    // 1. 直接クエリで確認
    console.log('1. 直接クエリで2025年11月のデータを確認:');
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_acquisition_date, visit_date, confidence')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .order('seller_number');

    if (error) throw error;

    const totalInquiries = sellers?.length || 0;
    const withVisitAcquisition = sellers?.filter(s => s.visit_acquisition_date).length || 0;
    const withVisitDate = sellers?.filter(s => s.visit_date).length || 0;

    console.log(`  依頼件数（D、ダブり除く）: ${totalInquiries} 件`);
    console.log(`  visit_acquisition_date が存在: ${withVisitAcquisition} 件`);
    console.log(`  visit_date が存在: ${withVisitDate} 件\n`);

    // 2. PerformanceMetricsService を使用して確認
    console.log('2. PerformanceMetricsService で計算:');
    const metricsService = new PerformanceMetricsService();
    const metrics = await metricsService.calculateMetrics('2025-11');

    console.log(`  訪問査定取得数: ${metrics.visitAppraisalCount} 件`);
    console.log(`  訪問査定取得割合: ${metrics.visitAppraisalRate.toFixed(2)}%\n`);

    // 3. 期待値との比較
    console.log('3. 期待値との比較:');
    console.log(`  期待値: 24 件`);
    console.log(`  実際の値: ${metrics.visitAppraisalCount} 件`);
    console.log(`  差分: ${24 - metrics.visitAppraisalCount} 件`);

    if (metrics.visitAppraisalCount === 24) {
      console.log('\n✅ 修正成功！期待値と一致しました');
    } else if (metrics.visitAppraisalCount === 0) {
      console.log('\n⚠️ visit_acquisition_date のデータが同期されていません');
      console.log('   sync-visit-acquisition-date.ts を実行してください');
    } else {
      console.log('\n⚠️ 期待値と一致しません。データを確認してください');
    }

    // 4. visit_acquisition_date が存在する売主のリスト
    if (withVisitAcquisition > 0 && withVisitAcquisition <= 30) {
      console.log('\n4. visit_acquisition_date が存在する売主リスト:');
      const withAcquisition = sellers?.filter(s => s.visit_acquisition_date) || [];
      withAcquisition.forEach((seller, index) => {
        console.log(`  ${index + 1}. ${seller.seller_number} - 訪問取得日: ${seller.visit_acquisition_date}`);
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

verifyFix();
