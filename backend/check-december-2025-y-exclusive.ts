import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDecember2025YExclusive() {
  console.log('=== 2025年12月 営担Y の専任件数チェック ===\n');

  // 2025年12月の範囲
  const startDate = new Date(Date.UTC(2025, 11, 1)).toISOString(); // 12月1日
  const endDate = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)).toISOString(); // 12月31日

  console.log('検索条件:');
  console.log('- contract_year_month: 2025-12-01 ~ 2025-12-31');
  console.log('- status: 専任媒介');
  console.log('- visit_assignee: Y');
  console.log('- confidence: D, ダブり 以外\n');

  // 営担Yの専任媒介を取得
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month, confidence, inquiry_date, visit_date')
    .eq('status', '専任媒介')
    .eq('visit_assignee', 'Y')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .not('confidence', 'in', '("D","ダブり")')
    .order('contract_year_month', { ascending: true });

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`\n検索結果: ${data?.length || 0}件\n`);

  if (data && data.length > 0) {
    data.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   状況: ${seller.status}`);
      console.log(`   営担: ${seller.visit_assignee}`);
      console.log(`   契約年月: ${seller.contract_year_month}`);
      console.log(`   確度: ${seller.confidence || '(空欄)'}`);
      console.log(`   依頼日: ${seller.inquiry_date || '(空欄)'}`);
      console.log(`   訪問日: ${seller.visit_date || '(空欄)'}`);
      console.log('');
    });
  }

  // 念のため、visit_assigneeがnullや空欄でないかも確認
  const { data: allYData, error: allYError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month, confidence')
    .eq('status', '専任媒介')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .not('confidence', 'in', '("D","ダブり")')
    .order('visit_assignee', { ascending: true });

  if (!allYError && allYData) {
    console.log('\n=== 2025年12月の全専任媒介（営担別） ===\n');
    const byAssignee = new Map<string, number>();
    
    allYData.forEach(seller => {
      const assignee = seller.visit_assignee || '(空欄)';
      byAssignee.set(assignee, (byAssignee.get(assignee) || 0) + 1);
    });

    Array.from(byAssignee.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([assignee, count]) => {
        console.log(`${assignee}: ${count}件`);
      });
  }

  // Yの全データ（確度D・ダブり含む）も確認
  const { data: allYIncludingD, error: allYIncludingDError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month, confidence')
    .eq('status', '専任媒介')
    .eq('visit_assignee', 'Y')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .order('confidence', { ascending: true });

  if (!allYIncludingDError && allYIncludingD) {
    console.log('\n=== 営担Yの専任媒介（確度D・ダブり含む） ===\n');
    console.log(`合計: ${allYIncludingD.length}件\n`);
    
    allYIncludingD.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   確度: ${seller.confidence || '(空欄)'}`);
      console.log(`   契約年月: ${seller.contract_year_month}`);
      console.log('');
    });
  }
}

checkDecember2025YExclusive().catch(console.error);
