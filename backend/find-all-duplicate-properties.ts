import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllDuplicateProperties() {
  console.log('=== Finding All Duplicate Properties ===\n');

  // Get all sellers with property counts
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number');

  if (error || !sellers) {
    console.error('Error fetching sellers:', error);
    return;
  }

  console.log(`Checking ${sellers.length} sellers...\n`);

  const duplicates: Array<{ sellerNumber: string; sellerId: string; count: number }> = [];

  for (const seller of sellers) {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id);

    if (properties && properties.length > 1) {
      duplicates.push({
        sellerNumber: seller.seller_number,
        sellerId: seller.id,
        count: properties.length
      });
    }
  }

  console.log(`Found ${duplicates.length} sellers with duplicate properties:\n`);

  duplicates.forEach(dup => {
    console.log(`  ${dup.sellerNumber}: ${dup.count} properties`);
  });

  console.log(`\nTotal duplicate properties to clean: ${duplicates.reduce((sum, d) => sum + (d.count - 1), 0)}`);

  return duplicates;
}

findAllDuplicateProperties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
