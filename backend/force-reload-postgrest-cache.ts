/**
 * Force PostgREST Schema Cache Reload
 * 
 * This script forces PostgREST to reload its schema cache by sending a NOTIFY signal.
 * Use this when migrations have been applied but PostgREST hasn't picked up the changes.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceReloadCache() {
  console.log('🔄 Forcing PostgREST schema cache reload...\n');

  try {
    // Method 1: Try using NOTIFY command via RPC
    console.log('Method 1: Sending NOTIFY signal via RPC...');
    const { error: notifyError } = await supabase.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema';"
    });

    if (notifyError) {
      console.log('⚠️  RPC method not available.');
      console.log('Error:', notifyError.message);
      console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:\n');
      console.log('---');
      console.log("NOTIFY pgrst, 'reload schema';");
      console.log('---\n');
      console.log('Steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Paste the SQL above');
      console.log('4. Click "Run"');
      console.log('5. Wait 30 seconds');
      console.log('6. Run: npx ts-node verify-buyers-last-synced-direct.ts');
      return false;
    }

    console.log('✅ NOTIFY signal sent successfully!\n');
    console.log('⏳ Waiting 10 seconds for PostgREST to reload...');
    
    // Wait for PostgREST to process the reload
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n🔍 Verifying schema cache reload...');
    
    // Try to access the column
    const { data: buyers, error: selectError } = await supabase
      .from('buyers')
      .select('id, last_synced_at')
      .limit(1);

    if (selectError) {
      console.error('❌ Schema cache not yet reloaded');
      console.error('Error:', selectError.message);
      console.error('\n⏳ Please wait another 1-2 minutes and try again:');
      console.error('   npx ts-node verify-buyers-last-synced-direct.ts');
      return false;
    }

    console.log('✅ Schema cache successfully reloaded!');
    console.log('✅ Column is now accessible!\n');
    
    console.log('🎉 Success! You can now run:');
    console.log('   npx ts-node sync-buyers.ts');
    
    return true;

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\n📋 Please try manual method:');
    console.error('1. Go to Supabase SQL Editor');
    console.error('2. Run: NOTIFY pgrst, \'reload schema\';');
    console.error('3. Wait 30 seconds');
    console.error('4. Run: npx ts-node verify-buyers-last-synced-direct.ts');
    return false;
  }
}

forceReloadCache()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
