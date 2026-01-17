import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

let attemptCount = 0;
const maxAttempts = 30; // 30 attempts = 15 minutes (checking every 30 seconds)

async function checkCache(): Promise<boolean> {
  attemptCount++;
  const timestamp = new Date().toLocaleTimeString('ja-JP');
  
  console.log(`\n[${timestamp}] Attempt ${attemptCount}/${maxAttempts}: Checking schema cache...`);

  try {
    const { error } = await supabase
      .from('buyers')
      .select('id, last_synced_at')
      .limit(1);

    if (error) {
      console.log(`   ❌ Cache not refreshed yet (${error.code})`);
      return false;
    }

    console.log('   ✅ SUCCESS! Schema cache has been refreshed!');
    console.log('   🎉 The last_synced_at column is now accessible.');
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error);
    return false;
  }
}

async function monitor() {
  console.log('🔄 Starting schema cache monitor...');
  console.log('📊 Checking every 30 seconds for up to 15 minutes');
  console.log('⏸️  Press Ctrl+C to stop\n');
  console.log('💡 TIP: To speed this up, restart your Supabase project from the dashboard');
  console.log('   https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/settings/general\n');

  const interval = setInterval(async () => {
    const success = await checkCache();

    if (success) {
      clearInterval(interval);
      console.log('\n✨ Cache refresh detected! You can now proceed with buyer sync.');
      console.log('\nNext step: Run the buyer sync migration:');
      console.log('   npx ts-node migrations/run-051-migration.ts');
      process.exit(0);
    }

    if (attemptCount >= maxAttempts) {
      clearInterval(interval);
      console.log('\n⏱️  Timeout reached (15 minutes)');
      console.log('\n📋 Recommended actions:');
      console.log('1. Restart your Supabase project from the dashboard');
      console.log('2. Or contact Supabase support');
      console.log('\nSee: backend/SUPABASE_CACHE_REFRESH_SOLUTIONS.md');
      process.exit(1);
    }
  }, 30000); // Check every 30 seconds

  // Do first check immediately
  const success = await checkCache();
  if (success) {
    clearInterval(interval);
    console.log('\n✨ Cache is already refreshed! You can proceed with buyer sync.');
    process.exit(0);
  }
}

monitor().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
