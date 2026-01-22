import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkUNovemberGeneralAgency() {
  console.log('\n=== 2025年11月 営担 U の一般媒介を確認 ===\n');

  // contract_year_monthが2025年11月で一般媒介
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month, visit_assignee')
    .eq('visit_assignee', 'U')
    .gte('contract_year_month', '2025-11-01')
    .lte('contract_year_month', '2025-11-30')
    .eq('status', '一般媒介');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`contract_year_monthが2025年11月で一般媒介の件数: ${data.length}件\n`);
  
  if (data.length > 0) {
    data.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   状況: ${seller.status}`);
      console.log(`   訪問日: ${seller.visit_date || '(空欄)'}`);
      console.log(`   契約年月: ${seller.contract_year_month}`);
      console.log('');
    });
  } else {
    console.log('該当データなし');
  }

  // 念のため、全営担で確認
  console.log('\n=== 全営担で2025年11月の一般媒介を確認 ===\n');
  
  const { data: allData, error: allError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month, visit_assignee')
    .gte('contract_year_month', '2025-11-01')
    .lte('contract_year_month', '2025-11-30')
    .eq('status', '一般媒介')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '');

  if (allError) {
    console.error('Error:', allError);
    return;
  }

  console.log(`全営担で contract_year_monthが2025年11月で一般媒介の件数: ${allData.length}件\n`);
  
  if (allData.length > 0) {
    allData.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   営担: ${seller.visit_assignee}`);
      console.log(`   状況: ${seller.status}`);
      console.log(`   訪問日: ${seller.visit_date || '(空欄)'}`);
      console.log(`   契約年月: ${seller.contract_year_month}`);
      console.log('');
    });
  } else {
    console.log('該当データなし');
  }
}

checkUNovemberGeneralAgency().catch(console.error);
