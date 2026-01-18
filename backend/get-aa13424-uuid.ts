import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAA13424UUID() {
  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, visit_acquisition_date, visit_date, visit_valuation_acquirer, visit_assignee')
    .eq('seller_number', 'AA13424')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('✅ AA13424のデータ:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n📍 通話モードURL:');
  console.log(`http://localhost:5174/sellers/${data.id}/call`);
}

getAA13424UUID();
