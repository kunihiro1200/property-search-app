import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking buyers table structure directly...\n');

  try {
    // Get all columns in buyers table
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'buyers')
      .order('ordinal_position');

    if (error) {
      console.error('❌ Error querying information_schema:', error);
      
      // Try alternative method using raw SQL
      console.log('\n🔄 Trying alternative method with raw query...\n');
      
      const { data: rawData, error: rawError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'buyers'
            ORDER BY ordinal_position;
          `
        });
      
      if (rawError) {
        console.error('❌ Raw query also failed:', rawError);
        return;
      }
      
      console.log('✅ Columns in buyers table:');
      console.log(JSON.stringify(rawData, null, 2));
      return;
    }

    console.log('✅ Columns in buyers table:\n');
    columns?.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
    });

    // Check specifically for sync-related columns
    const syncColumns = columns?.filter((col: any) => 
      col.column_name.includes('sync') || col.column_name.includes('last_')
    );

    console.log('\n📊 Sync-related columns:');
    if (syncColumns && syncColumns.length > 0) {
      syncColumns.forEach((col: any) => {
        console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  ⚠️  No sync-related columns found!');
    }

    // Check for last_synced_at specifically
    const hasSyncedAt = columns?.some((col: any) => col.column_name === 'last_synced_at');
    const hasSyncStatus = columns?.some((col: any) => col.column_name === 'sync_status');
    const hasSyncError = columns?.some((col: any) => col.column_name === 'sync_error');

    console.log('\n🎯 Migration 054 columns check:');
    console.log(`  last_synced_at: ${hasSyncedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  sync_status: ${hasSyncStatus ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  sync_error: ${hasSyncError ? '✅ EXISTS' : '❌ MISSING'}`);

    if (!hasSyncedAt || !hasSyncStatus || !hasSyncError) {
      console.log('\n⚠️  Migration 054 has NOT been applied to the database!');
      console.log('\n📋 Action required:');
      console.log('  1. Run: npx ts-node migrations/run-054-migration.ts');
      console.log('  2. Or run: npx ts-node migrations/run-054-direct.ts');
    } else {
      console.log('\n✅ All Migration 054 columns are present in the database!');
      console.log('   The issue is with PostgREST schema cache.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTableStructure()
  .then(() => {
    console.log('\n✨ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
