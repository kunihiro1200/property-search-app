import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncTablesSimple() {
  console.log('=== Simple Sync Tables Check ===\n');

  // Try to query each table directly
  console.log('1. Checking sync_logs table...');
  try {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ sync_logs table error:', error.message);
    } else {
      console.log('✅ sync_logs table exists and is accessible');
      console.log(`   Sample data count: ${data?.length || 0}`);
    }
  } catch (err) {
    console.log('❌ sync_logs table error:', err);
  }

  console.log('\n2. Checking error_logs table...');
  try {
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ error_logs table error:', error.message);
    } else {
      console.log('✅ error_logs table exists and is accessible');
      console.log(`   Sample data count: ${data?.length || 0}`);
    }
  } catch (err) {
    console.log('❌ error_logs table error:', err);
  }

  console.log('\n3. Checking sync_health table...');
  try {
    const { data, error } = await supabase
      .from('sync_health')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ sync_health table error:', error.message);
    } else {
      console.log('✅ sync_health table exists and is accessible');
      console.log(`   Sample data count: ${data?.length || 0}`);
    }
  } catch (err) {
    console.log('❌ sync_health table error:', err);
  }

  console.log('\n4. Checking sellers table for synced_to_sheet_at column...');
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('id, synced_to_sheet_at')
      .limit(1);

    if (error) {
      console.log('❌ sellers.synced_to_sheet_at column error:', error.message);
    } else {
      console.log('✅ sellers.synced_to_sheet_at column exists and is accessible');
      if (data && data.length > 0) {
        console.log(`   Sample value: ${data[0].synced_to_sheet_at || 'null'}`);
      }
    }
  } catch (err) {
    console.log('❌ sellers.synced_to_sheet_at column error:', err);
  }

  console.log('\n5. Checking migrations table...');
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('id, name, executed_at')
      .in('name', ['026_add_sync_logs', '039_add_sync_health', '052_add_error_logs', '053_add_sync_metadata_columns'])
      .order('id');

    if (error) {
      console.log('❌ migrations table error:', error.message);
    } else {
      console.log('✅ Migration history:');
      if (data && data.length > 0) {
        data.forEach((migration: any) => {
          console.log(`   - ${migration.name} (executed: ${migration.executed_at})`);
        });
      } else {
        console.log('   No relevant migrations found');
      }
    }
  } catch (err) {
    console.log('❌ migrations table error:', err);
  }
}

checkSyncTablesSimple().catch(console.error);
