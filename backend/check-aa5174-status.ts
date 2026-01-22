import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5174Status() {
  console.log('=== Checking AA5174 Status ===\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5174')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Seller:', seller.seller_number, '-', seller.name);
  console.log('Status:', `"${seller.status}"`);
  console.log('Status type:', typeof seller.status);
  console.log('Status length:', seller.status?.length);
  console.log('Status char codes:', seller.status?.split('').map((c: string) => c.charCodeAt(0)));
  console.log('');
  console.log('Site:', `"${seller.site}"`);
  console.log('');
  
  // Check if property exists
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();
    
  if (propError) {
    console.log('Property: NO');
  } else {
    console.log('Property: YES');
    console.log('Property Address:', property.address);
  }
}

checkAA5174Status()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
