import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 2025年11月の営担 I のデータを visit_date 基準で確認
 */
async function debugAssigneeIVisitDate() {
  console.log('=== 2025年11月 営担 I のデータ (visit_date 基準) ===\n');

  const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString(); // 2025-11-01
  const endDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString(); // 2025-11-30

  // 1. visit_date が 2025年11月の営担 I の総件数
  const { data: visitData, error: visitError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, visit_date, contract_year_month')
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .eq('visit_assignee', 'I');

  if (visitError) {
    console.error('❌ エラー:', visitError);
    return;
  }

  console.log(`📊 visit_date が 2025年11月の営担 I の総件数: ${visitData?.length || 0}件\n`);

  if (visitData && visitData.length > 0) {
    console.log('詳細:');
    visitData.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status || '(空欄)'}`);
      console.log(`     訪問日: ${row.visit_date || '(空欄)'}`);
      console.log(`     契約年月: ${row.contract_year_month || '(空欄)'}`);
    });
  }

  // 2. contract_year_month が 2025年11月 AND status に "他決" を含む
  const contractStartDate = new Date(Date.UTC(2025, 10, 1)).toISOString();
  const contractEndDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString();

  const { data: lossData, error: lossError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, visit_date, contract_year_month')
    .gte('contract_year_month', contractStartDate)
    .lte('contract_year_month', contractEndDate)
    .like('status', '%他決%');

  if (lossError) {
    console.error('❌ エラー:', lossError);
    return;
  }

  // 営担 I のみフィルタ
  const lossDataI = lossData?.filter(row => row.visit_assignee === 'I') || [];

  console.log(`\n📊 contract_year_month が 2025年11月 AND status に "他決" を含む (営担 I): ${lossDataI.length}件\n`);

  if (lossDataI.length > 0) {
    console.log('詳細:');
    lossDataI.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status}`);
      console.log(`     訪問日: ${row.visit_date || '(空欄)'}`);
      console.log(`     契約年月: ${row.contract_year_month}`);
    });
  }

  // 3. visit_date が 2025年11月 AND status = "一般媒介" (営担 I)
  const { data: generalData, error: generalError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, visit_date, contract_year_month')
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .eq('visit_assignee', 'I')
    .eq('status', '一般媒介');

  if (generalError) {
    console.error('❌ エラー:', generalError);
    return;
  }

  console.log(`\n📊 visit_date が 2025年11月 AND status = "一般媒介" (営担 I): ${generalData?.length || 0}件\n`);

  if (generalData && generalData.length > 0) {
    console.log('詳細:');
    generalData.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status}`);
      console.log(`     訪問日: ${row.visit_date}`);
      console.log(`     契約年月: ${row.contract_year_month || '(空欄)'}`);
    });
  }

  // 4. 計算結果（visit_date 基準の分母）
  const totalCount = visitData?.length || 0;
  const lossCount = lossDataI.length;
  const generalCount = generalData?.length || 0;
  const denominator = totalCount - generalCount;
  const rate = denominator > 0 ? (lossCount / denominator) * 100 : 0;

  console.log('\n─────────────────────────────────────');
  console.log('📊 計算結果 (visit_date 基準の分母):');
  console.log(`  総件数 (visit_date が 11月): ${totalCount}件`);
  console.log(`  他決件数（分子、contract_year_month が 11月）: ${lossCount}件`);
  console.log(`  一般媒介件数 (visit_date が 11月): ${generalCount}件`);
  console.log(`  分母: ${totalCount} - ${generalCount} = ${denominator}件`);
  console.log(`  他決割合: ${lossCount} ÷ ${denominator} = ${rate.toFixed(1)}%`);
  console.log('─────────────────────────────────────');

  // 期待値との比較
  console.log('\n✅ 期待値との比較:');
  console.log(`  期待される分子: 2件`);
  console.log(`  期待される分母: 11件 (12 - 1)`);
  console.log(`  期待される割合: 18.2%`);

  if (lossCount === 2 && denominator === 11) {
    console.log('  ✅ 計算結果が期待値と一致しています');
  } else {
    console.log('  ⚠️ 計算結果が期待値と異なります');
    console.log(`  実際の分子: ${lossCount}件 (期待: 2件)`);
    console.log(`  実際の分母: ${denominator}件 (期待: 11件)`);
  }
}

// スクリプトを実行
debugAssigneeIVisitDate()
  .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
