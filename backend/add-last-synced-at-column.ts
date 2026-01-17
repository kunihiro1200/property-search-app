import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addLastSyncedAtColumn() {
  console.log('=== Adding last_synced_at column to buyers table ===\n');
  
  try {
    // First, check if column already exists
    const { data: checkData, error: checkError } = await supabase
      .from('buyers')
      .select('*')
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    if (checkData && checkData.length > 0) {
      const columns = Object.keys(checkData[0]);
      if (columns.includes('last_synced_at')) {
        console.log('✅ Column last_synced_at already exists!');
        console.log('No action needed.');
        return;
      }
    }
    
    console.log('Column last_synced_at does not exist. Adding it now...\n');
    console.log('⚠️  IMPORTANT: This script cannot directly execute DDL statements.');
    console.log('Please run the following SQL in Supabase SQL Editor:\n');
    console.log('---SQL START---');
    console.log('ALTER TABLE buyers');
    console.log('  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;');
    console.log('');
    console.log('CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);');
    console.log('---SQL END---\n');
    console.log('Steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click "Run"');
    console.log('4. After successful execution, run: npx ts-node sync-buyer-6648.ts');
    console.log('\nAlternatively, you can use the Supabase CLI:');
    console.log('  supabase db execute --file migrations/054_add_buyers_sync_columns.sql');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addLastSyncedAtColumn()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
