import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12923() {
  console.log('🔍 Checking AA12923 data after sync...\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (error || !seller) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Raw data from database:');
  console.log('  seller_number:', seller.seller_number);
  console.log('  name (encrypted):', seller.name?.substring(0, 50) + '...');
  console.log('  name (decrypted):', seller.name ? decrypt(seller.name) : 'null');
  console.log('  address (decrypted):', seller.address ? decrypt(seller.address) : 'null');
  console.log('  phone_number (decrypted):', seller.phone_number ? decrypt(seller.phone_number) : 'null');
  console.log('  email (decrypted):', seller.email ? decrypt(seller.email) : 'null');
  console.log('  valuation_amount_1:', seller.valuation_amount_1);
  console.log('  valuation_amount_2:', seller.valuation_amount_2);
  console.log('  valuation_amount_3:', seller.valuation_amount_3);
  console.log('  comments:', seller.comments);
  console.log('  status:', seller.status);
}

checkAA12923().catch(console.error);
