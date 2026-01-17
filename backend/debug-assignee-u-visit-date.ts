import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugAssigneeU() {
  console.log('\n=== 2025年11月 営担 U のデータ (visit_date 基準) ===\n');

  // visit_dateが2025年11月の営担Uの全データ
  const { data: visitNovemberU, error: visitError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month')
    .eq('visit_assignee', 'U')
    .gte('visit_date', '2025-11-01')
    .lte('visit_date', '2025-11-30')
    .order('visit_date');

  if (visitError) {
    console.error('Error fetching visit data:', visitError);
    return;
  }

  console.log(`📊 visit_date が 2025年11月の営担 U の総件数: ${visitNovemberU.length}件\n`);
  console.log('詳細:');
  visitNovemberU.forEach((seller, index) => {
    console.log(`  ${index + 1}. ${seller.seller_number}`);
    console.log(`     状況: ${seller.status || '(空欄)'}`);
    console.log(`     訪問日: ${seller.visit_date}`);
    console.log(`     契約年月: ${seller.contract_year_month || '(空欄)'}`);
  });

  // 分子: contract_year_monthが2025-11でstatusに"他決"を含む
  const { data: takketsuNovemberU, error: takketsuError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month')
    .eq('visit_assignee', 'U')
    .gte('contract_year_month', '2025-11-01')
    .lte('contract_year_month', '2025-11-30')
    .ilike('status', '%他決%');

  if (takketsuError) {
    console.error('Error fetching takketsu data:', takketsuError);
    return;
  }

  console.log(`\n📊 contract_year_month が 2025年11月 AND status に "他決" を含む (営担 U): ${takketsuNovemberU.length}件`);
  console.log('詳細:');
  takketsuNovemberU.forEach((seller, index) => {
    console.log(`  ${index + 1}. ${seller.seller_number}`);
    console.log(`     状況: ${seller.status}`);
    console.log(`     訪問日: ${seller.visit_date || '(空欄)'}`);
    console.log(`     契約年月: ${seller.contract_year_month}`);
  });

  // visit_dateが2025年11月でstatus="一般媒介"
  const { data: ippanU, error: ippanError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month')
    .eq('visit_assignee', 'U')
    .gte('visit_date', '2025-11-01')
    .lte('visit_date', '2025-11-30')
    .eq('status', '一般媒介');

  if (ippanError) {
    console.error('Error fetching ippan data:', ippanError);
    return;
  }

  console.log(`\n📊 visit_date が 2025年11月 AND status = "一般媒介" (営担 U): ${ippanU.length}件`);
  console.log('詳細:');
  ippanU.forEach((seller, index) => {
    console.log(`  ${index + 1}. ${seller.seller_number}`);
    console.log(`     状況: ${seller.status}`);
    console.log(`     訪問日: ${seller.visit_date}`);
    console.log(`     契約年月: ${seller.contract_year_month || '(空欄)'}`);
  });

  console.log('\n─────────────────────────────────────');
  console.log('📊 計算結果 (visit_date 基準の分母):');
  console.log(`  総件数 (visit_date が 11月): ${visitNovemberU.length}件`);
  console.log(`  他決件数（分子、contract_year_month が 11月）: ${takketsuNovemberU.length} 件`);
  console.log(`  一般媒介件数 (visit_date が 11月): ${ippanU.length}件`);
  const denominator = visitNovemberU.length - ippanU.length;
  console.log(`  分母: ${visitNovemberU.length} - ${ippanU.length} = ${denominator}件`);
  const percentage = denominator > 0 ? ((takketsuNovemberU.length / denominator) * 100).toFixed(1) : '0.0';
  console.log(`  他決割合: ${takketsuNovemberU.length} ÷ ${denominator} = ${percentage}%`);
  console.log('─────────────────────────────────────\n');

  console.log('✅ 期待値との比較:');
  console.log(`  期待される分子: 1件`);
  console.log(`  期待される分母: 9 - 1 = 8件`);
  console.log(`  期待される割合: 12.5%`);
  
  if (takketsuNovemberU.length === 1 && denominator === 8 && percentage === '12.5') {
    console.log('  ✅ 計算結果が期待値と一致しています');
  } else {
    console.log('  ❌ 計算結果が期待値と一致しません');
    console.log(`  実際の分子: ${takketsuNovemberU.length}件`);
    console.log(`  実際の分母: ${denominator}件`);
    console.log(`  実際の割合: ${percentage}%`);
  }

  console.log('\n✅ デバッグ完了\n');
}

debugAssigneeU().catch(console.error);
