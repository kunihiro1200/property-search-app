import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSellerNames() {
  console.log('Checking seller names...\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('No sellers found');
    return;
  }

  console.log(`Found ${sellers.length} sellers:\n`);

  for (const seller of sellers) {
    try {
      const decryptedName = decrypt(seller.name);
      console.log(`${seller.seller_number}: "${decryptedName}"`);
    } catch (e: any) {
      console.log(`${seller.seller_number}: DECRYPTION ERROR - ${e.message}`);
    }
  }
}

checkSellerNames()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
