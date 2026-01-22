import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkUNovemberStatus() {
  console.log('\n=== 2025年11月 営担 U の全状況を確認 ===\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_date, contract_year_month')
    .eq('visit_assignee', 'U')
    .gte('visit_date', '2025-11-01')
    .lte('visit_date', '2025-11-30')
    .order('visit_date');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`総件数: ${data.length}件\n`);
  
  data.forEach((seller, index) => {
    console.log(`${index + 1}. ${seller.seller_number}`);
    console.log(`   状況: "${seller.status}"`);
    console.log(`   訪問日: ${seller.visit_date}`);
    console.log(`   契約年月: ${seller.contract_year_month || '(空欄)'}`);
    console.log('');
  });

  // 一般媒介を含む可能性のある状況をチェック
  const ippanVariations = ['一般媒介', '一般', '媒介'];
  
  for (const variation of ippanVariations) {
    const filtered = data.filter(s => s.status && s.status.includes(variation));
    if (filtered.length > 0) {
      console.log(`\n"${variation}"を含む件数: ${filtered.length}件`);
      filtered.forEach(s => {
        console.log(`  - ${s.seller_number}: ${s.status}`);
      });
    }
  }
}

checkUNovemberStatus().catch(console.error);
