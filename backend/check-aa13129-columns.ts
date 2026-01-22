import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .single();
  
  if (error) {
    console.log('エラー:', error);
  } else {
    console.log('=== AA13129のカラム一覧 ===');
    console.log(Object.keys(data));
    console.log('\n=== データ ===');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkColumns().catch(console.error);
