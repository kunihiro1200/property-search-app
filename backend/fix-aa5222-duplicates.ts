import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA5222Duplicates() {
  console.log('=== Fixing AA5222 Duplicate Properties ===\n');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA5222')
    .single();

  if (!seller) {
    console.log('Seller not found');
    return;
  }

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  console.log(`Found ${properties?.length} properties\n`);

  if (!properties || properties.length <= 1) {
    console.log('No duplicates to fix');
    return;
  }

  // Keep the most recent one with data
  const propertyToKeep = properties[0]; // Most recent
  const propertiesToDelete = properties.slice(1);

  console.log('Keeping property:', propertyToKeep.id);
  console.log('  Address:', propertyToKeep.address);
  console.log('  Created:', propertyToKeep.created_at);
  console.log('');

  console.log(`Deleting ${propertiesToDelete.length} duplicate properties...`);
  
  for (const prop of propertiesToDelete) {
    console.log(`  Deleting ${prop.id} (${prop.created_at})`);
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', prop.id);
    
    if (error) {
      console.error(`    ❌ Error: ${error.message}`);
    } else {
      console.log(`    ✅ Deleted`);
    }
  }

  console.log('\n✅ Cleanup complete');
}

fixAA5222Duplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
