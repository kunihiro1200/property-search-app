import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNovember2025AssigneeI() {
  console.log('2025年11月 営担I の他決データを確認');
  console.log('='.repeat(80));

  const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString(); // 2025-11-01
  const endDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString(); // 2025-11-30

  // 他決の数（分子）: 契約年月が2025年11月、営担が入力されている、状況に"他決"を含む
  console.log('\n【他決の数（分子）】');
  console.log('条件: contract_year_month が 2025-11、visit_assignee = "I"、status に "他決" を含む');
  console.log('-'.repeat(80));

  const { data: lossData, error: lossError } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, status, contract_year_month, visit_date, inquiry_date')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .eq('visit_assignee', 'I')
    .like('status', '%他決%')
    .order('seller_number');

  if (lossError) {
    console.error('エラー:', lossError);
    return;
  }

  console.log(`\n他決件数: ${lossData?.length || 0}件\n`);
  
  if (lossData && lossData.length > 0) {
    lossData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.seller_number}`);
      console.log(`   営担: ${row.visit_assignee}`);
      console.log(`   状況: ${row.status}`);
      console.log(`   契約年月: ${row.contract_year_month}`);
      console.log(`   訪問日: ${row.visit_date || 'なし'}`);
      console.log(`   反響日: ${row.inquiry_date || 'なし'}`);
      console.log('');
    });
  }

  // 訪問の件数（分母）: 契約年月が2025年11月、営担 = "I"
  console.log('\n【訪問の件数（分母）】');
  console.log('条件: contract_year_month が 2025-11、visit_assignee = "I"');
  console.log('-'.repeat(80));

  const { data: visitData, error: visitError } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, status, contract_year_month')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .eq('visit_assignee', 'I')
    .order('seller_number');

  if (visitError) {
    console.error('エラー:', visitError);
    return;
  }

  console.log(`\n訪問件数: ${visitData?.length || 0}件\n`);

  if (visitData && visitData.length > 0) {
    visitData.forEach((row, index) => {
      const isLoss = row.status && row.status.includes('他決');
      console.log(`${index + 1}. ${row.seller_number} ${isLoss ? '★他決' : ''}`);
      console.log(`   営担: ${row.visit_assignee}`);
      console.log(`   状況: ${row.status}`);
      console.log(`   契約年月: ${row.contract_year_month}`);
      console.log('');
    });
  }

  // 割合を計算
  const lossCount = lossData?.length || 0;
  const visitCount = visitData?.length || 0;
  const rate = visitCount > 0 ? (lossCount / visitCount) * 100 : 0;

  console.log('\n【計算結果】');
  console.log('='.repeat(80));
  console.log(`他決数: ${lossCount}件`);
  console.log(`訪問件数: ${visitCount}件`);
  console.log(`他決割合: ${rate.toFixed(1)}%`);
  console.log('');

  // PerformanceMetricsServiceの結果と比較
  console.log('\n【PerformanceMetricsServiceの結果】');
  console.log('='.repeat(80));
  const service = new PerformanceMetricsService();
  const result = await service.calculateCompetitorLossVisited(2025, 11);
  
  const assigneeI = result.byRepresentative.find(r => r.representative === 'I');
  if (assigneeI) {
    console.log(`他決数: ${assigneeI.count}件`);
    console.log(`他決割合: ${assigneeI.rate.toFixed(1)}%`);
  } else {
    console.log('営担Iのデータが見つかりません');
  }
}

checkNovember2025AssigneeI()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nエラー:', error);
    process.exit(1);
  });
