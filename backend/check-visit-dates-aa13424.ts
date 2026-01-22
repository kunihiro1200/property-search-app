import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkVisitDates() {
  console.log(' AA13424の訪問日付フィールドを確認\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, visit_date, visit_time, visit_acquisition_date, visit_assignee, visit_valuation_acquirer')
    .eq('seller_number', 'AA13424')
    .single();

  if (error || !seller) {
    console.error(' エラー:', error);
    return;
  }

  console.log(' データベースの訪問フィールド:');
  console.log('  売主番号:', seller.seller_number);
  console.log('  訪問日 (visit_date):', seller.visit_date || '未設定');
  console.log('  訪問時刻 (visit_time):', seller.visit_time || '未設定');
  console.log('  訪問取得日 (visit_acquisition_date):', seller.visit_acquisition_date || '未設定');
  console.log('  営担 (visit_assignee):', seller.visit_assignee || '未設定');
  console.log('  訪問査定取得者 (visit_valuation_acquirer):', seller.visit_valuation_acquirer || '未設定');
}

checkVisitDates().catch(console.error);
