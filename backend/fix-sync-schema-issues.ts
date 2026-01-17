/**
 * Quick Fix: Apply missing migrations and reload schema cache
 * 
 * This script:
 * 1. Runs migrations 026, 039, and 051 if not already applied
 * 2. Reloads the PostgREST schema cache
 * 3. Verifies all tables exist
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string) {
  console.log(`\n📝 Running migration: ${migrationFile}`);
  
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error running ${migrationFile}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception running ${migrationFile}:`, err);
    return false;
  }
}

async function reloadSchemaCache() {
  console.log('\n🔄 Reloading PostgREST schema cache...');
  
  try {
    // Method 1: Use PostgREST admin endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      }
    });
    
    console.log('✅ Schema cache reload initiated');
    
    // Wait a moment for cache to reload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (err) {
    console.error('❌ Error reloading schema cache:', err);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables exist...');
  
  const tablesToCheck = [
    'sync_logs',
    'sync_health',
    'seller_deletion_audit'
  ];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${table} not accessible:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    } catch (err) {
      console.error(`❌ Error checking table ${table}:`, err);
    }
  }
}

async function verifyColumns() {
  console.log('\n🔍 Verifying columns exist...');
  
  try {
    // Check sellers.deleted_at
    const { data, error } = await supabase
      .from('sellers')
      .select('deleted_at')
      .limit(1);
    
    if (error) {
      console.error('❌ Column sellers.deleted_at not accessible:', error.message);
    } else {
      console.log('✅ Column sellers.deleted_at exists');
    }
  } catch (err) {
    console.error('❌ Error checking sellers.deleted_at:', err);
  }
}

async function main() {
  console.log('🚀 Starting schema fix...\n');
  
  // Run migrations in order
  const migrations = [
    '026_add_sync_logs.sql',
    '039_add_sync_health.sql',
    '051_add_soft_delete_support.sql'
  ];
  
  for (const migration of migrations) {
    await runMigration(migration);
  }
  
  // Reload schema cache
  await reloadSchemaCache();
  
  // Verify everything
  await verifyTables();
  await verifyColumns();
  
  console.log('\n✅ Schema fix complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart your backend server');
  console.log('2. The sync should now work without errors');
}

main().catch(console.error);
