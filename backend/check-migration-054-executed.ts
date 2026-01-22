import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkMigration054() {
  console.log('Checking if migration 054 was executed...\n');

  // Check if migrations table exists and has record for 054
  const { data: migrations, error: migrationsError } = await supabase
    .from('migrations')
    .select('*')
    .eq('version', '054')
    .single();

  if (migrationsError) {
    console.log('Could not check migrations table:', migrationsError.message);
    console.log('This might mean the migrations table does not exist or migration 054 was not recorded.\n');
  } else if (migrations) {
    console.log('✅ Migration 054 was executed:');
    console.log(migrations);
    console.log();
  } else {
    console.log('❌ Migration 054 was NOT executed\n');
  }

  // Check if the column actually exists
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error checking buyers table:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    const hasLastSyncedAt = columns.includes('last_synced_at');
    const hasSyncedAt = columns.includes('synced_at');
    
    console.log('Column check:');
    console.log(`  - last_synced_at: ${hasLastSyncedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - synced_at: ${hasSyncedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log();
    
    if (!hasLastSyncedAt && hasSyncedAt) {
      console.log('⚠️  ISSUE FOUND: Table has "synced_at" but code expects "last_synced_at"');
      console.log('   This is causing the PostgREST schema cache error.');
      console.log();
      console.log('SOLUTION: Run migration 054 to add the last_synced_at column');
    }
  }
}

checkMigration054()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
