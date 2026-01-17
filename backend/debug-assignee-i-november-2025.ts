import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 2025年11月の営担 I のデータを詳細に確認
 */
async function debugAssigneeINovember2025() {
  console.log('=== 2025年11月 営担 I のデータ詳細確認 ===\n');

  const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString(); // 2025-11-01
  const endDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString(); // 2025-11-30

  // 1. 営担 I の総件数（contract_year_month が 2025年11月）
  const { data: totalData, error: totalError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .eq('visit_assignee', 'I');

  if (totalError) {
    console.error('❌ エラー:', totalError);
    return;
  }

  console.log(`📊 営担 I の総件数: ${totalData?.length || 0}件\n`);

  if (totalData && totalData.length > 0) {
    console.log('詳細:');
    totalData.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status || '(空欄)'}`);
      console.log(`     契約年月: ${row.contract_year_month || '(空欄)'}`);
    });
  }

  // 2. 営担 I の他決件数（status に "他決" を含む）
  const { data: lossData, error: lossError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .eq('visit_assignee', 'I')
    .like('status', '%他決%');

  if (lossError) {
    console.error('❌ エラー:', lossError);
    return;
  }

  console.log(`\n📊 営担 I の他決件数: ${lossData?.length || 0}件\n`);

  if (lossData && lossData.length > 0) {
    console.log('詳細:');
    lossData.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status}`);
      console.log(`     契約年月: ${row.contract_year_month}`);
    });
  }

  // 3. 営担 I の一般媒介件数（status = "一般媒介"）
  const { data: generalData, error: generalError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .eq('visit_assignee', 'I')
    .eq('status', '一般媒介');

  if (generalError) {
    console.error('❌ エラー:', generalError);
    return;
  }

  console.log(`\n📊 営担 I の一般媒介件数: ${generalData?.length || 0}件\n`);

  if (generalData && generalData.length > 0) {
    console.log('詳細:');
    generalData.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.seller_number}`);
      console.log(`     状況: ${row.status}`);
      console.log(`     契約年月: ${row.contract_year_month}`);
    });
  }

  // 4. 計算結果
  const totalCount = totalData?.length || 0;
  const lossCount = lossData?.length || 0;
  const generalCount = generalData?.length || 0;
  const denominator = totalCount - generalCount;
  const rate = denominator > 0 ? (lossCount / denominator) * 100 : 0;

  console.log('\n─────────────────────────────────────');
  console.log('📊 計算結果:');
  console.log(`  総件数: ${totalCount}件`);
  console.log(`  他決件数（分子）: ${lossCount}件`);
  console.log(`  一般媒介件数: ${generalCount}件`);
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
debugAssigneeINovember2025()
  .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
