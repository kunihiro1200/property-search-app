/**
 * Verify Migration 050 readiness and current state
 * This script checks if buyers table exists and estimates the fix needed
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function verifyMigration050Ready() {
  console.log('🔍 Verifying Migration 050 Readiness...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Check if buyers table exists
  console.log('1️⃣ Checking if buyers table exists...');
  const { count: buyerCount, error: countError } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error accessing buyers table:', countError.message);
    console.log('\n💡 The buyers table may not exist yet.');
    console.log('   Run Migration 042 first: backend/migrations/042_add_buyers_complete.sql');
    process.exit(1);
  }

  console.log(`✅ Buyers table exists with ${buyerCount} records\n`);

  // Try to get a sample buyer to test field lengths
  console.log('2️⃣ Checking for VARCHAR(50) issues...');
  const { data: sampleBuyers, error: sampleError } = await supabase
    .from('buyers')
    .select('*')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error reading sample buyers:', sampleError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully read ${sampleBuyers?.length || 0} sample buyers\n`);

  // Check for common long-text fields
  console.log('3️⃣ Analyzing field content lengths...');
  
  const fieldsToCheck = [
    'name', 'email', 'property_address', 'athome_url', 
    'google_map_url', 'inquiry_source', 'desired_area'
  ];

  let hasLongValues = false;
  const longFields: string[] = [];

  if (sampleBuyers && sampleBuyers.length > 0) {
    sampleBuyers.forEach((buyer, index) => {
      fieldsToCheck.forEach(field => {
        const value = buyer[field];
        if (value && typeof value === 'string' && value.length > 50) {
          hasLongValues = true;
          if (!longFields.includes(field)) {
            longFields.push(field);
          }
          console.log(`   ⚠️  Buyer ${index + 1}: ${field} = ${value.length} chars (exceeds 50)`);
        }
      });
    });
  }

  if (longFields.length > 0) {
    console.log(`\n⚠️  Found ${longFields.length} fields with values > 50 characters:`);
    longFields.forEach(field => console.log(`   - ${field}`));
  } else {
    console.log('   ℹ️  Sample buyers have no values exceeding 50 characters');
    console.log('   (But VARCHAR(50) columns may still cause issues with other data)');
  }

  console.log('\n4️⃣ Checking sync status...');
  
  // Get expected count from environment or estimate
  const expectedCount = 4137; // From context
  const difference = expectedCount - (buyerCount || 0);

  if (difference > 0) {
    console.log(`⚠️  Missing ${difference} buyers (${((difference / expectedCount) * 100).toFixed(1)}%)`);
    console.log(`   Expected: ${expectedCount}`);
    console.log(`   Current: ${buyerCount}`);
    console.log(`   Missing: ${difference}`);
  } else {
    console.log(`✅ All ${buyerCount} buyers are synced!`);
  }

  console.log('\n📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Buyers table: ✅ EXISTS`);
  console.log(`Current count: ${buyerCount} buyers`);
  console.log(`Expected count: ${expectedCount} buyers`);
  console.log(`Missing: ${difference} buyers`);
  console.log(`Long values found: ${hasLongValues ? '⚠️  YES' : '✅ NO (in sample)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n🎯 Recommended Actions:');
  
  if (difference > 0) {
    console.log('');
    console.log('   ⚠️  You have missing buyers. This is likely due to VARCHAR(50) errors.');
    console.log('');
    console.log('   📝 Execute these steps:');
    console.log('');
    console.log('   1. Open Supabase SQL Editor');
    console.log('   2. Copy contents of: backend/migrations/050_fix_remaining_buyer_varchar_fields.sql');
    console.log('   3. Paste and Run in SQL Editor');
    console.log('   4. Wait for success message');
    console.log('   5. Run: npx ts-node sync-buyers.ts');
    console.log('   6. Run: npx ts-node check-buyer-count-comparison.ts');
    console.log('');
    console.log('   📚 See: backend/BUYERS_TABLE_VARCHAR_FIX_NOW.md');
  } else {
    console.log('');
    console.log('   ✅ All buyers are synced!');
    console.log('   Migration 050 may have already been applied.');
    console.log('');
    console.log('   To verify:');
    console.log('   - Run: npx ts-node check-buyer-count-comparison.ts');
  }

  console.log('\n✨ Verification complete!');
  process.exit(0);
}

verifyMigration050Ready().catch(console.error);
