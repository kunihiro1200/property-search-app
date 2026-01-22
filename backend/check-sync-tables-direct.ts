import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncTables() {
  console.log('=== Sync Tables Check ===\n');

  // Check sync_logs table by trying to query it
  console.log('1. Checking sync_logs table...');
  const { data: syncLogsData, error: syncLogsError } = await supabase
    .from('sync_logs')
    .select('*')
    .limit(1);

  if (syncLogsError) {
    if (syncLogsError.code === 'PGRST204' || syncLogsError.message.includes('does not exist')) {
      console.log('❌ sync_logs table does not exist');
      console.log('   Error:', syncLogsError.message);
    } else {
      console.log('❌ Error accessing sync_logs:', syncLogsError.message);
    }
  } else {
    console.log('✅ sync_logs table exists and is accessible');
    console.log(`   Sample data count: ${syncLogsData?.length || 0}`);
  }

  // Check error_logs table
  console.log('\n2. Checking error_logs table...');
  const { data: errorLogsData, error: errorLogsError } = await supabase
    .from('error_logs')
    .select('*')
    .limit(1);

  if (errorLogsError) {
    if (errorLogsError.code === 'PGRST204' || errorLogsError.message.includes('does not exist')) {
      console.log('❌ error_logs table does not exist');
      console.log('   Error:', errorLogsError.message);
    } else {
      console.log('❌ Error accessing error_logs:', errorLogsError.message);
    }
  } else {
    console.log('✅ error_logs table exists and is accessible');
    console.log(`   Sample data count: ${errorLogsData?.length || 0}`);
  }

  // Check sync_health table
  console.log('\n3. Checking sync_health table...');
  const { data: syncHealthData, error: syncHealthError } = await supabase
    .from('sync_health')
    .select('*')
    .limit(1);

  if (syncHealthError) {
    if (syncHealthError.code === 'PGRST204' || syncHealthError.message.includes('does not exist')) {
      console.log('❌ sync_health table does not exist');
      console.log('   Error:', syncHealthError.message);
    } else {
      console.log('❌ Error accessing sync_health:', syncHealthError.message);
    }
  } else {
    console.log('✅ sync_health table exists and is accessible');
    console.log(`   Sample data count: ${syncHealthData?.length || 0}`);
  }

  // Check sellers table for synced_to_sheet_at column
  console.log('\n4. Checking sellers table for synced_to_sheet_at column...');
  const { data: sellersData, error: sellersError } = await supabase
    .from('sellers')
    .select('id, synced_to_sheet_at')
    .limit(1);

  if (sellersError) {
    if (sellersError.message.includes('synced_to_sheet_at')) {
      console.log('❌ synced_to_sheet_at column does not exist in sellers table');
      console.log('   Error:', sellersError.message);
    } else {
      console.log('❌ Error accessing sellers table:', sellersError.message);
    }
  } else {
    console.log('✅ synced_to_sheet_at column exists in sellers table');
    console.log(`   Sample data count: ${sellersData?.length || 0}`);
  }

  console.log('\n=== Summary ===');
  console.log('If all tables show as existing and accessible, the migrations were successful.');
  console.log('If tables do not exist, you need to run the migrations:');
  console.log('  - Migration 026: Creates sync_logs table');
  console.log('  - Migration 039: Creates error_logs and sync_health tables');
  console.log('  - Migration 053: Adds synced_to_sheet_at to sellers table');
}

checkSyncTables().catch(console.error);
