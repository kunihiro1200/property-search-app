import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllStatusValues() {
  console.log('=== Checking All Unique Status Values ===\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('status')
    .not('status', 'is', null);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Get unique status values
  const uniqueStatuses = new Set<string>();
  sellers?.forEach(seller => {
    if (seller.status) {
      uniqueStatuses.add(seller.status);
    }
  });

  const sortedStatuses = Array.from(uniqueStatuses).sort();

  console.log(`Found ${sortedStatuses.length} unique status values:\n`);
  sortedStatuses.forEach((status, index) => {
    console.log(`${index + 1}. "${status}"`);
  });

  // Count occurrences
  console.log('\n=== Status Value Counts ===\n');
  const statusCounts: Record<string, number> = {};
  sellers?.forEach(seller => {
    if (seller.status) {
      statusCounts[seller.status] = (statusCounts[seller.status] || 0) + 1;
    }
  });

  const sortedByCount = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1]);

  sortedByCount.forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
}

checkAllStatusValues()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
