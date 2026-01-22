import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSeller() {
  console.log('🔍 Checking seller AA13225...');
  
  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, address, email')
    .ilike('seller_number', 'AA13225')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('❌ Seller AA13225 not found');
    return;
  }

  console.log('✅ Seller found:');
  console.log('  ID:', data.id);
  console.log('  Seller Number:', data.seller_number);
  console.log('  Name:', data.name);
  console.log('  Address:', data.address);
  console.log('  Email:', data.email);
}

checkSeller().catch(console.error);
