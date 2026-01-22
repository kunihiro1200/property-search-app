import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMultipleSellersStatus() {
  console.log('=== Checking Multiple Sellers Status ===\n');

  // Get first 20 sellers with their status, property, and site info
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      name,
      status,
      site,
      property:properties!seller_id (
        id,
        address,
        property_type
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${sellers?.length} sellers:\n`);
  
  sellers?.forEach((seller, index) => {
    console.log(`${index + 1}. ${seller.seller_number} - ${seller.name}`);
    console.log(`   Status: "${seller.status || 'NULL'}"`);
    console.log(`   Site: "${seller.site || 'NULL'}"`);
    console.log(`   Property: ${seller.property ? 'YES' : 'NO'}`);
    if (seller.property && Array.isArray(seller.property) && seller.property.length > 0) {
      console.log(`   Property Address: ${(seller.property as any)[0].address || 'NULL'}`);
    }
    console.log('');
  });
}

checkMultipleSellersStatus()
  .then(() => {
    console.log('✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
