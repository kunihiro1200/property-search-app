/**
 * Test: Verify deleted sellers are filtered out
 * AA13494 and AA13490 should NOT appear in results
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testDeletedSellersFilter() {
  console.log('=== Testing deleted sellers filter ===\n');

  // Test 1: Check if AA13494 and AA13490 have deleted_at set
  console.log('1. Checking deleted_at status in database...');
  const { data: deletedCheck, error: checkError } = await supabase
    .from('sellers')
    .select('seller_number, deleted_at')
    .in('seller_number', ['AA13494', 'AA13490']);

  if (checkError) {
    console.error('Error:', checkError.message);
    return;
  }

  console.log('Database status:');
  deletedCheck?.forEach(s => {
    console.log(`  ${s.seller_number}: deleted_at = ${s.deleted_at || 'NULL'}`);
  });

  // Test 2: Query with deleted_at IS NULL filter (simulating getSellers)
  console.log('\n2. Testing query with deleted_at IS NULL filter...');
  const { data: filteredSellers, error: filterError } = await supabase
    .from('sellers')
    .select('seller_number')
    .is('deleted_at', null)
    .in('seller_number', ['AA13494', 'AA13490']);

  if (filterError) {
    console.error('Error:', filterError.message);
    return;
  }

  console.log('Filtered query result:');
  if (filteredSellers && filteredSellers.length > 0) {
    console.log('  ❌ BUG: Found deleted sellers:', filteredSellers.map(s => s.seller_number).join(', '));
  } else {
    console.log('  ✅ CORRECT: No deleted sellers found (they are properly filtered out)');
  }

  // Test 3: Count total sellers with and without filter
  console.log('\n3. Comparing counts...');
  
  const { count: totalCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  const { count: activeCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  console.log(`  Total sellers (including deleted): ${totalCount}`);
  console.log(`  Active sellers (deleted_at IS NULL): ${activeCount}`);
  console.log(`  Deleted sellers: ${(totalCount || 0) - (activeCount || 0)}`);

  console.log('\n=== Test complete ===');
}

testDeletedSellersFilter().catch(console.error);
