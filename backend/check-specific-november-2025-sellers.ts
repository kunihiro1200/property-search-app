import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSpecificSellers() {
  console.log('ユーザー指定の6件の売主データを確認');
  console.log('='.repeat(80));

  const sellerNumbers = ['AA3333', 'AA9406', 'AA12825', 'AA12998', 'AA13059', 'AA13158'];

  console.log(`\n確認対象: ${sellerNumbers.join(', ')}\n`);

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, status, contract_year_month, visit_date, inquiry_date')
    .in('seller_number', sellerNumbers)
    .order('seller_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('データが見つかりません');
    return;
  }

  console.log(`取得件数: ${data.length}件\n`);

  let competitorLossCount = 0;
  const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString();
  const endDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString();

  data.forEach((row, index) => {
    const isInNovember2025 = row.contract_year_month >= startDate && row.contract_year_month <= endDate;
    const hasVisitAssigneeI = row.visit_assignee === 'I';
    const isCompetitorLoss = row.status && row.status.includes('他決');
    
    const meetsAllCriteria = isInNovember2025 && hasVisitAssigneeI && isCompetitorLoss;
    
    if (meetsAllCriteria) {
      competitorLossCount++;
    }

    console.log(`${index + 1}. ${row.seller_number} ${meetsAllCriteria ? '✓ 他決としてカウント' : ''}`);
    console.log(`   営担: ${row.visit_assignee || 'なし'} ${hasVisitAssigneeI ? '✓' : '✗'}`);
    console.log(`   状況: ${row.status || 'なし'} ${isCompetitorLoss ? '✓ 他決を含む' : '✗ 他決を含まない'}`);
    console.log(`   契約年月: ${row.contract_year_month || 'なし'} ${isInNovember2025 ? '✓ 2025年11月' : '✗ 2025年11月以外'}`);
    console.log(`   訪問日: ${row.visit_date || 'なし'}`);
    console.log(`   反響日: ${row.inquiry_date || 'なし'}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('【集計結果】');
  console.log(`全6件のうち、他決としてカウントされる件数: ${competitorLossCount}件`);
  console.log('');
  console.log('【カウント条件】');
  console.log('1. contract_year_month が 2025年11月（2025-11-01 ～ 2025-11-30）');
  console.log('2. visit_assignee = "I"');
  console.log('3. status に "他決" を含む');
  console.log('');
  
  if (competitorLossCount !== 6) {
    console.log('⚠️ ユーザーの期待値（6件）と異なります');
    console.log('');
    console.log('【考えられる原因】');
    console.log('- 一部の売主の status に "他決" が含まれていない');
    console.log('- 一部の売主の visit_assignee が "I" ではない');
    console.log('- 一部の売主の contract_year_month が 2025年11月ではない');
  } else {
    console.log('✓ ユーザーの期待値（6件）と一致します');
  }
}

checkSpecificSellers()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nエラー:', error);
    process.exit(1);
  });
