import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env.local' });
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA376Valuation() {
  console.log('=== AA376の査定額データ確認 ===\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, valuation_text, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA376')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('売主番号:', data.seller_number);
  console.log('valuation_text:', data.valuation_text);
  console.log('valuation_amount_1:', data.valuation_amount_1);
  console.log('valuation_amount_2:', data.valuation_amount_2);
  console.log('valuation_amount_3:', data.valuation_amount_3);
  
  if (data.valuation_amount_1) {
    console.log('\n査定額1（万円）:', Math.round(data.valuation_amount_1 / 10000));
  }
  if (data.valuation_amount_2) {
    console.log('査定額2（万円）:', Math.round(data.valuation_amount_2 / 10000));
  }
  if (data.valuation_amount_3) {
    console.log('査定額3（万円）:', Math.round(data.valuation_amount_3 / 10000));
  }
}

checkAA376Valuation();
