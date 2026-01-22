import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseNullUUIDBuyers() {
  console.log('=== Diagnosing Buyers with NULL/Missing IDs ===\n');

  try {
    // Find all buyers with NULL buyer_id (primary key)
    console.log('1. Finding all buyers with NULL buyer_id...');
    const { data: nullIDBuyers, error: nullError, count } = await supabase
      .from('buyers')
      .select('buyer_number, name, email, phone_number, reception_date, inquiry_source, buyer_id', { count: 'exact' })
      .is('buyer_id', null)
      .order('buyer_number', { ascending: true });

    if (nullError) {
      console.error('❌ Error fetching buyers with NULL buyer_id:', nullError);
    } else if (!nullIDBuyers || nullIDBuyers.length === 0) {
      console.log('✅ No buyers found with NULL buyer_id');
    } else {
      console.log(`⚠️  Found ${count} buyers with NULL buyer_id:\n`);
      nullIDBuyers.forEach(buyer => {
        console.log(`  Buyer ${buyer.buyer_number}: ${buyer.name}`);
      });
    }

    // Check buyer 6647 specifically
    console.log('\n2. Checking buyer 6647 specifically...');
    const { data: buyer6647, error: buyer6647Error } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6647')
      .single();

    if (buyer6647Error) {
      console.error('❌ Error fetching buyer 6647:', buyer6647Error);
    } else if (!buyer6647) {
      console.log('❌ Buyer 6647 not found');
    } else {
      console.log('✅ Buyer 6647 found:');
      console.log(`   buyer_id: ${buyer6647.buyer_id || 'NULL'}`);
      console.log(`   buyer_number: ${buyer6647.buyer_number || 'NULL'}`);
      console.log(`   name: ${buyer6647.name || 'NULL'}`);
      console.log(`   email: ${buyer6647.email || 'NULL'}`);
      console.log(`   phone_number: ${buyer6647.phone_number || 'NULL'}`);
      console.log(`   reception_date: ${buyer6647.reception_date || 'NULL'}`);
      
      if (!buyer6647.buyer_id) {
        console.log('\n⚠️  PROBLEM: buyer_id is NULL!');
        console.log('   This will cause API endpoints to fail.');
      }
    }

    // Check if buyer_id is being used correctly in the API
    console.log('\n3. Checking API endpoint expectations...');
    console.log('   The API route /api/buyers/:id expects either:');
    console.log('   - buyer_id (primary key)');
    console.log('   - buyer_number (for backward compatibility)');
    console.log('');
    console.log('   Current issue: Frontend may be passing buyer_number (6647)');
    console.log('   but API is trying to use it as buyer_id');

    // Check how many buyers have buyer_number but no buyer_id
    console.log('\n4. Checking data integrity...');
    const { data: allBuyers, error: allError } = await supabase
      .from('buyers')
      .select('buyer_id, buyer_number')
      .limit(10);

    if (allError) {
      console.error('❌ Error checking data integrity:', allError);
    } else if (allBuyers) {
      console.log(`✅ Sample of ${allBuyers.length} buyers:`);
      allBuyers.forEach(b => {
        console.log(`   buyer_id: ${b.buyer_id || 'NULL'}, buyer_number: ${b.buyer_number || 'NULL'}`);
      });
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log('The buyers table uses buyer_id (TEXT) as primary key, not UUID.');
    console.log('Buyer 6647 may have:');
    console.log('  1. NULL buyer_id (data integrity issue)');
    console.log('  2. Valid buyer_id but API is not finding it correctly');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check if buyer_id is NULL for buyer 6647');
    console.log('  2. Check if API is correctly resolving buyer_number to buyer_id');
    console.log('  3. Check frontend code to see what ID it\'s passing');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseNullUUIDBuyers();
