import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyMigrations() {
  console.log('🔍 Verifying calendar webhook and sync migrations (019-020)...\n');

  try {
    // Check calendar_webhook_channels table
    console.log('📋 Checking calendar_webhook_channels table...');
    const { error: webhookError } = await supabase
      .from('calendar_webhook_channels')
      .select('*')
      .limit(1);

    if (webhookError) {
      if (webhookError.code === '42P01') {
        console.log('❌ calendar_webhook_channels table does NOT exist');
        console.log('   Please run migration 019_add_calendar_webhook_channels.sql\n');
        return false;
      } else {
        console.error('❌ Error checking calendar_webhook_channels:', webhookError);
        return false;
      }
    }

    console.log('✅ calendar_webhook_channels table exists');

    // Check calendar_sync_tokens table
    console.log('📋 Checking calendar_sync_tokens table...');
    const { error: syncError } = await supabase
      .from('calendar_sync_tokens')
      .select('*')
      .limit(1);

    if (syncError) {
      if (syncError.code === '42P01') {
        console.log('❌ calendar_sync_tokens table does NOT exist');
        console.log('   Please run migration 020_add_calendar_sync_tokens.sql\n');
        return false;
      } else {
        console.error('❌ Error checking calendar_sync_tokens:', syncError);
        return false;
      }
    }

    console.log('✅ calendar_sync_tokens table exists\n');

    console.log('✅ All migrations verified successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  ✓ calendar_webhook_channels');
    console.log('  ✓ calendar_sync_tokens');
    console.log('');
    console.log('🎉 Database is ready for Google Calendar webhook notifications and sync!');

    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

async function main() {
  const success = await verifyMigrations();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
