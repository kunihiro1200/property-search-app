// Direct Migration 054: Add missing sync columns to buyers table
// This script executes the migration directly without using exec_sql
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('=== Running Migration 054: Add Buyers Sync Columns ===\n');
    
    console.log('Step 1: Adding last_synced_at column...');
    
    // Add the column using raw SQL query
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE buyers
        ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
      `
    });
    
    if (alterError) {
      console.log('⚠️  Could not use exec_sql function.');
      console.log('Please execute the migration manually in Supabase SQL Editor.\n');
      console.log('📋 Copy and paste this SQL into Supabase SQL Editor:\n');
      console.log('---');
      console.log('ALTER TABLE buyers');
      console.log('  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;');
      console.log('');
      console.log('CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);');
      console.log('---\n');
      console.log('After executing in Supabase:');
      console.log('1. Run: npx ts-node sync-buyers.ts');
      console.log('2. Verify: npx ts-node check-buyer-count-comparison.ts');
      return;
    }
    
    console.log('✅ Column added successfully!');
    
    console.log('\nStep 2: Creating index...');
    
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);
      `
    });
    
    if (indexError) {
      console.log('⚠️  Could not create index automatically.');
      console.log('Please create it manually in Supabase SQL Editor.');
      return;
    }
    
    console.log('✅ Index created successfully!\n');
    console.log('✅ Migration 054 completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Run buyer sync: npx ts-node sync-buyers.ts');
    console.log('2. Verify counts: npx ts-node check-buyer-count-comparison.ts');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Please execute this SQL manually in Supabase SQL Editor:\n');
    console.error('---');
    console.error('ALTER TABLE buyers');
    console.error('  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;');
    console.error('');
    console.error('CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);');
    console.error('---');
  }
}

runMigration();
