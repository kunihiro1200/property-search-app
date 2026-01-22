import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13231December() {
  console.log('=== AA13231 の詳細確認 ===\n');

  // AA13231を検索
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13231')
    .single();

  if (error) {
    console.error('エラー:', error);
    console.log('\nAA13231が見つかりませんでした。');
    return;
  }

  if (data) {
    console.log('売主番号:', data.seller_number);
    console.log('状況（当社）:', data.status);
    console.log('営担:', data.visit_assignee);
    console.log('契約年月:', data.contract_year_month);
    console.log('確度:', data.confidence);
    console.log('依頼日:', data.inquiry_date);
    console.log('訪問日:', data.visit_date);
    console.log('訪問査定取得日:', data.visit_acquisition_date);
    console.log('\n--- 全フィールド ---');
    console.log(JSON.stringify(data, null, 2));
  }

  // 2025年12月の範囲で検索
  const startDate = new Date(Date.UTC(2025, 11, 1)).toISOString();
  const endDate = new Date(Date.UTC(2025, 11, 31, 23, 59, 59, 999)).toISOString();

  console.log('\n\n=== 2025年12月の契約年月を持つ全売主（営担Y） ===\n');

  const { data: allDecemberY, error: allError } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, contract_year_month, confidence')
    .eq('visit_assignee', 'Y')
    .gte('contract_year_month', startDate)
    .lte('contract_year_month', endDate)
    .order('contract_year_month', { ascending: true });

  if (!allError && allDecemberY) {
    console.log(`合計: ${allDecemberY.length}件\n`);
    allDecemberY.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   状況: ${seller.status}`);
      console.log(`   契約年月: ${seller.contract_year_month}`);
      console.log(`   確度: ${seller.confidence || '(空欄)'}`);
      console.log('');
    });
  }
}

checkAA13231December().catch(console.error);
