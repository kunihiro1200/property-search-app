// Run Migration 054: Add missing sync columns to buyers table
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('=== Running Migration 054: Add Buyers Sync Columns ===\n');
    
    const sqlPath = path.join(__dirname, '054_add_buyers_sync_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('This migration will add the missing last_synced_at column to buyers table.');
    console.log('This column is required by BuyerSyncService for proper synchronization.\n');
    console.log('Executing SQL...\n');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migration 054 completed successfully!\n');
    console.log('Added columns:');
    console.log('  - last_synced_at (TIMESTAMP WITH TIME ZONE)');
    console.log('  - idx_buyers_last_synced_at (INDEX)\n');
    console.log('Next steps:');
    console.log('1. Run buyer sync: npx ts-node sync-buyers.ts');
    console.log('2. Verify counts: npx ts-node check-buyer-count-comparison.ts');
    console.log('\nExpected result:');
    console.log('  Spreadsheet: 4138 buyers');
    console.log('  Database:    4138 buyers');
    console.log('  Difference:  0 buyers ✅');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nIf the error persists, you can manually execute the SQL in Supabase SQL Editor:');
    console.error('File location:', path.join(__dirname, '054_add_buyers_sync_columns.sql'));
    console.error('\nSQL to execute:');
    console.error('---');
    const sqlPath = path.join(__dirname, '054_add_buyers_sync_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.error(sql);
    console.error('---');
    process.exit(1);
  }
}

runMigration();
