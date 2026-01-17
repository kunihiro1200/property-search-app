import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuyerSyncLogsTable() {
  console.log('🔍 Checking buyer_sync_logs table...\n');

  try {
    // Check if table exists by querying it
    const { data, error, count } = await supabase
      .from('buyer_sync_logs')
      .select('*', { count: 'exact', head: false })
      .order('synced_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error querying buyer_sync_logs table:', error.message);
      console.log('\n⚠️  Table may not exist yet. Please run Migration 057 in Supabase SQL Editor.');
      return;
    }

    console.log('✅ buyer_sync_logs table exists!');
    console.log(`📊 Total records: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('\n📝 Latest sync log:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\n📝 No sync logs yet (table is empty)');
    }

    console.log('\n✅ Migration 057 verification complete!');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkBuyerSyncLogsTable();
