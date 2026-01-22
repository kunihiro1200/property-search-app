import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA3687Status() {
  console.log('=== Checking Seller AA3687 Status ===\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, status')
    .eq('seller_number', 'AA3687')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Seller:', seller);
  console.log('Status:', seller?.status);
  console.log('Status type:', typeof seller?.status);
  console.log('Status length:', seller?.status?.length);
  console.log('Status bytes:', Buffer.from(seller?.status || '', 'utf8').toString('hex'));
}

checkAA3687Status()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
