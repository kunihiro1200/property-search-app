import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncTablesStructure() {
  console.log('=== Sync Tables Structure Check ===\n');

  // Check sync_logs table
  console.log('1. Checking sync_logs table...');
  const { data: syncLogsColumns, error: syncLogsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'sync_logs')
    .order('ordinal_position');

  if (syncLogsError) {
    console.error('Error checking sync_logs:', syncLogsError);
  } else if (!syncLogsColumns || syncLogsColumns.length === 0) {
    console.log('❌ sync_logs table does not exist');
  } else {
    console.log('✅ sync_logs table exists with columns:');
    syncLogsColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }

  console.log('\n2. Checking error_logs table...');
  const { data: errorLogsColumns, error: errorLogsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'error_logs')
    .order('ordinal_position');

  if (errorLogsError) {
    console.error('Error checking error_logs:', errorLogsError);
  } else if (!errorLogsColumns || errorLogsColumns.length === 0) {
    console.log('❌ error_logs table does not exist');
  } else {
    console.log('✅ error_logs table exists with columns:');
    errorLogsColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }

  console.log('\n3. Checking sync_health table...');
  const { data: syncHealthColumns, error: syncHealthError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'sync_health')
    .order('ordinal_position');

  if (syncHealthError) {
    console.error('Error checking sync_health:', syncHealthError);
  } else if (!syncHealthColumns || syncHealthColumns.length === 0) {
    console.log('❌ sync_health table does not exist');
  } else {
    console.log('✅ sync_health table exists with columns:');
    syncHealthColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }

  console.log('\n4. Checking sellers table for synced_to_sheet_at column...');
  const { data: sellersColumns, error: sellersError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'sellers')
    .eq('column_name', 'synced_to_sheet_at');

  if (sellersError) {
    console.error('Error checking sellers:', sellersError);
  } else if (!sellersColumns || sellersColumns.length === 0) {
    console.log('❌ synced_to_sheet_at column does not exist in sellers table');
  } else {
    console.log('✅ synced_to_sheet_at column exists in sellers table');
  }
}

checkSyncTablesStructure().catch(console.error);
