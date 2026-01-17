import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusComplete() {
  console.log('=== Checking All Status Values (Including NULL) ===\n');

  const { data: sellers, error, count } = await supabase
    .from('sellers')
    .select('status', { count: 'exact' });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Total sellers: ${count}\n`);

  // Get unique status values including null
  const statusCounts: Record<string, number> = {};
  sellers?.forEach(seller => {
    const status = seller.status || 'NULL';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const sortedByCount = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('=== All Status Values (Sorted by Count) ===\n');
  sortedByCount.forEach(([status, count]) => {
    const percentage = ((count / (sellers?.length || 1)) * 100).toFixed(2);
    console.log(`${status}: ${count} (${percentage}%)`);
  });

  console.log(`\n=== Total Unique Status Values: ${sortedByCount.length} ===`);
}

checkStatusComplete()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
