import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verifying Migration 039...\n');

  try {
    // Check if sync_health table exists
    console.log('1. Checking sync_health table...');
    const { data: syncHealthData, error: syncHealthError } = await supabase
      .from('sync_health')
      .select('*')
      .limit(1);

    if (syncHealthError) {
      console.log('❌ sync_health table does NOT exist');
      console.log('   Error:', syncHealthError.message);
    } else {
      console.log('✅ sync_health table exists');
      console.log('   Records:', syncHealthData?.length || 0);
      if (syncHealthData && syncHealthData.length > 0) {
        console.log('   Sample:', JSON.stringify(syncHealthData[0], null, 2));
      }
    }

    // Check if sync_logs has new columns
    console.log('\n2. Checking sync_logs table extensions...');
    const { error: syncLogsError } = await supabase
      .from('sync_logs')
      .select('missing_sellers_detected, triggered_by, health_status')
      .limit(1);

    if (syncLogsError) {
      console.log('❌ sync_logs extended columns do NOT exist');
      console.log('   Error:', syncLogsError.message);
    } else {
      console.log('✅ sync_logs extended columns exist');
      console.log('   Columns: missing_sellers_detected, triggered_by, health_status');
    }

    // Summary
    console.log('\n📊 Migration 039 Status:');
    if (!syncHealthError && !syncLogsError) {
      console.log('✅ Migration 039 is COMPLETE');
      console.log('   - sync_health table created');
      console.log('   - sync_logs table extended');
      console.log('   - Auto-sync health monitoring is ready');
    } else if (syncHealthError && !syncLogsError) {
      console.log('⚠️  Migration 039 is PARTIAL');
      console.log('   - sync_health table needs to be created manually');
      console.log('   - sync_logs table extended successfully');
    } else if (!syncHealthError && syncLogsError) {
      console.log('⚠️  Migration 039 is PARTIAL');
      console.log('   - sync_health table created successfully');
      console.log('   - sync_logs table needs to be extended manually');
    } else {
      console.log('❌ Migration 039 is INCOMPLETE');
      console.log('   - Both tables need manual intervention');
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigration();
