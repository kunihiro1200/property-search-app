import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMultipleSellers() {
  console.log('=== Testing Multiple Sellers ===\n');

  // Get 10 random sellers
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, site, status')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching sellers:', error);
    return;
  }

  console.log(`Found ${sellers?.length || 0} sellers\n`);

  for (const seller of sellers || []) {
    console.log(`\n--- Seller: ${seller.seller_number} ---`);
    console.log(`ID: ${seller.id}`);
    console.log(`Name: ${seller.name ? seller.name.substring(0, 20) + '...' : 'null'}`);
    console.log(`Site: ${seller.site || 'null'}`);
    console.log(`Status: ${seller.status || 'null'}`);

    // Check if property exists
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, address, property_type')
      .eq('seller_id', seller.id);

    if (propError) {
      console.log(`❌ Property query error: ${propError.message}`);
    } else if (!properties || properties.length === 0) {
      console.log('⚠️  No property found');
    } else {
      console.log(`✅ Property found: ${properties.length} record(s)`);
      console.log(`   Address: ${properties[0].address || 'null'}`);
      console.log(`   Type: ${properties[0].property_type || 'null'}`);
    }
  }
}

testMultipleSellers()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
