import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

/**
 * Verify that all Phase 1 columns exist in sellers table
 */
async function verifySellerColumns(): Promise<boolean> {
  console.log('🔍 Verifying sellers table columns...\n');

  const requiredColumns = [
    'seller_number',
    'inquiry_source',
    'inquiry_year',
    'inquiry_date',
    'inquiry_datetime',
    'is_unreachable',
    'confidence_level',
    'first_caller_initials',
    'first_caller_employee_id',
    'duplicate_confirmed',
    'valuation_amount_1',
    'valuation_amount_2',
    'valuation_amount_3',
    'visit_date',
    'appointment_date',
    'version',
  ];

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sellers'
      ORDER BY column_name;
    `
  });

  if (error) {
    console.error('❌ Failed to query columns:', error);
    return false;
  }

  const columns = (data as ColumnInfo[]).map(c => c.column_name);
  
  let allPresent = true;
  for (const col of requiredColumns) {
    if (columns.includes(col)) {
      console.log(`✅ ${col}`);
    } else {
      console.log(`❌ ${col} - MISSING`);
      allPresent = false;
    }
  }

  return allPresent;
}

/**
 * Verify seller_number_sequence table exists
 */
async function verifySequenceTable(): Promise<boolean> {
  console.log('\n🔍 Verifying seller_number_sequence table...\n');

  const { data, error } = await supabase
    .from('seller_number_sequence')
    .select('*')
    .single();

  if (error) {
    console.error('❌ seller_number_sequence table not found or empty:', error);
    return false;
  }

  console.log('✅ seller_number_sequence table exists');
  console.log(`   Current number: ${data.current_number}`);
  return true;
}

/**
 * Verify seller_history table exists
 */
async function verifyHistoryTable(): Promise<boolean> {
  console.log('\n🔍 Verifying seller_history table...\n');

  const { error } = await supabase
    .from('seller_history')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ seller_history table not found:', error);
    return false;
  }

  console.log('✅ seller_history table exists');
  return true;
}

/**
 * Verify generate_seller_number function exists
 */
async function verifyFunction(): Promise<boolean> {
  console.log('\n🔍 Verifying generate_seller_number function...\n');

  const { data, error } = await supabase.rpc('generate_seller_number');

  if (error) {
    console.error('❌ generate_seller_number function not found or failed:', error);
    return false;
  }

  console.log('✅ generate_seller_number function works');
  console.log(`   Generated: ${data}`);
  return true;
}

/**
 * Verify indexes exist
 */
async function verifyIndexes(): Promise<boolean> {
  console.log('\n🔍 Verifying indexes...\n');

  const requiredIndexes = [
    'idx_sellers_seller_number',
    'idx_sellers_inquiry_source',
    'idx_sellers_is_unreachable',
    'idx_sellers_confidence_level',
    'idx_sellers_duplicate_confirmed',
  ];

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'sellers'
      ORDER BY indexname;
    `
  });

  if (error) {
    console.error('❌ Failed to query indexes:', error);
    return false;
  }

  const indexes = (data as { indexname: string }[]).map(i => i.indexname);
  
  let allPresent = true;
  for (const idx of requiredIndexes) {
    if (indexes.includes(idx)) {
      console.log(`✅ ${idx}`);
    } else {
      console.log(`❌ ${idx} - MISSING`);
      allPresent = false;
    }
  }

  return allPresent;
}

/**
 * Main verification
 */
async function main() {
  console.log('🚀 Starting Phase 1 migration verification...\n');
  console.log('='.repeat(60));

  const results = {
    columns: await verifySellerColumns(),
    sequence: await verifySequenceTable(),
    history: await verifyHistoryTable(),
    function: await verifyFunction(),
    indexes: await verifyIndexes(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Verification Summary:\n');
  console.log(`   Seller columns: ${results.columns ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Sequence table: ${results.sequence ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   History table: ${results.history ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Function: ${results.function ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Indexes: ${results.indexes ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    console.log('\n✨ All verifications passed! Phase 1 migration is complete.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some verifications failed. Please check the migration.\n');
    process.exit(1);
  }
}

main();
