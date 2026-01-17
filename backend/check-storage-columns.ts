import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Checking AA13129 storage-related columns...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ No data found');
    return;
  }

  // storage, folder, drive を含むカラムを抽出
  const storageKeys = Object.keys(data).filter(k => 
    k.includes('storage') || k.includes('folder') || k.includes('drive')
  );

  console.log('📋 Storage-related columns:');
  storageKeys.forEach(key => {
    console.log(`\n${key}:`);
    console.log(`  Type: ${typeof data[key]}`);
    console.log(`  Value: ${data[key]}`);
  });

  // すべてのカラム名を表示
  console.log('\n\n📋 All columns:');
  Object.keys(data).sort().forEach(key => {
    console.log(`  - ${key}`);
  });
}

main();
