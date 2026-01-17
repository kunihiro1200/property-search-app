import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function countDuplicateProperties() {
  console.log('=== Counting Duplicate Properties ===\n');

  // Count total properties
  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  console.log(`Total properties: ${totalProperties}`);

  // Count unique sellers with properties
  const { data: uniqueSellers } = await supabase
    .from('properties')
    .select('seller_id');

  const uniqueSellerIds = new Set(uniqueSellers?.map(p => p.seller_id));
  console.log(`Unique sellers with properties: ${uniqueSellerIds.size}`);

  const duplicateCount = (totalProperties || 0) - uniqueSellerIds.size;
  console.log(`Duplicate properties: ${duplicateCount}`);

  console.log(`\nEstimated sellers with duplicates: ~${Math.floor(duplicateCount / 2)}`);
}

countDuplicateProperties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
