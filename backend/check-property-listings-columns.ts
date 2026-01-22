import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('=== property_listingsテーブルのカラム確認 ===\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.log('Error:', error);
  } else {
    const columns = Object.keys(data).sort();
    console.log('利用可能なカラム数:', columns.length);
    console.log('\nカラム一覧:');
    columns.forEach(col => console.log(`  - ${col}`));
    
    // remarksカラムがあるか確認
    console.log('\n--- 確認 ---');
    console.log('remarks カラム存在:', columns.includes('remarks'));
    console.log('atbb_status カラム存在:', columns.includes('atbb_status'));
  }
}

checkColumns();
