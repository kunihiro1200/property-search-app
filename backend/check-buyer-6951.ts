import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBuyer() {
  console.log('買主6951のデータを確認中...\n');
  
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6951')
    .single();
  
  if (error) {
    console.log('エラー:', error);
    return;
  }
  
  console.log('買主6951のデータ:');
  console.log('買主番号:', data.buyer_number);
  console.log('名前:', data.name);
  console.log('物件番号:', data.property_number);
  console.log('業者向けアンケート:', data.broker_survey);
  console.log('問い合わせ元:', data.inquiry_source);
  console.log('受付日:', data.reception_date);
  console.log('\n全データ:', JSON.stringify(data, null, 2));
}

checkBuyer();
