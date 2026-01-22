import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncTables() {
  console.log('🔍 Checking sync_logs and sync_health tables...\n');

  try {
    // Check sync_logs table
    console.log('1️⃣ Checking sync_logs table...');
    const { data: syncLogsData, error: syncLogsError } = await supabase
      .from('sync_logs')
      .select('*')
      .limit(1);

    if (syncLogsError) {
      console.error('❌ sync_logs table NOT found or error:', syncLogsError.message);
      console.log('   → Need to run migration 026_add_sync_logs.sql\n');
    } else {
      console.log('✅ sync_logs table exists');
      console.log(`   → Sample count: ${syncLogsData?.length || 0} records\n`);
    }

    // Check sync_health table
    console.log('2️⃣ Checking sync_health table...');
    const { data: syncHealthData, error: syncHealthError } = await supabase
      .from('sync_health')
      .select('*')
      .limit(1);

    if (syncHealthError) {
      console.error('❌ sync_health table NOT found or error:', syncHealthError.message);
      console.log('   → Need to run migration 039_add_sync_health.sql\n');
    } else {
      console.log('✅ sync_health table exists');
      console.log(`   → Sample count: ${syncHealthData?.length || 0} records`);
      if (syncHealthData && syncHealthData.length > 0) {
        console.log('   → Health status:', syncHealthData[0]);
      }
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    const syncLogsExists = !syncLogsError;
    const syncHealthExists = !syncHealthError;

    if (syncLogsExists && syncHealthExists) {
      console.log('✅ All required tables exist!');
      console.log('\n✨ Your database schema is complete.');
    } else {
      console.log('⚠️  Missing tables detected:');
      if (!syncLogsExists) {
        console.log('   - sync_logs (run: npm run migrate:026)');
      }
      if (!syncHealthExists) {
        console.log('   - sync_health (run: npm run migrate:039)');
      }
      console.log('\n📝 Next steps:');
      console.log('   1. Run the missing migrations');
      console.log('   2. Re-run this check script');
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkSyncTables();
