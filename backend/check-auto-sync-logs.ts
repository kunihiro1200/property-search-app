import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeGhyYnRsZ2ZqenNzZWVnYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAyMTQxMSwiZXhwIjoyMDc4NTk3NDExfQ.nog3UX9J9OgfqlCIPJt_sU_exE6Ny-nSj_HmwgV3oA8';

async function checkAutoSyncLogs() {
  console.log('🔍 Checking auto-sync logs...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // sync_logsテーブルを確認
  console.log('📋 Recent sync logs (last 20):');
  const { data: syncLogs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  if (logsError) {
    console.error('❌ Error:', logsError.message);
  } else if (syncLogs && syncLogs.length > 0) {
    syncLogs.forEach((log, i) => {
      console.log(`\n${i + 1}. Sync at ${log.started_at}`);
      console.log(`   Type: ${log.sync_type}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Duration: ${log.duration_ms}ms`);
      if (log.summary) {
        console.log(`   Summary:`, JSON.stringify(log.summary, null, 2));
      }
      if (log.error_message) {
        console.log(`   Error: ${log.error_message}`);
      }
    });
  } else {
    console.log('❌ No sync logs found');
  }

  // property_listing_sync_logsテーブルも確認
  console.log('\n\n📋 Recent property listing sync logs (last 10):');
  const { data: plSyncLogs, error: plLogsError } = await supabase
    .from('property_listing_sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10);

  if (plLogsError) {
    console.error('❌ Error:', plLogsError.message);
  } else if (plSyncLogs && plSyncLogs.length > 0) {
    plSyncLogs.forEach((log, i) => {
      console.log(`\n${i + 1}. Sync at ${log.synced_at}`);
      console.log(`   Type: ${log.sync_type}`);
      console.log(`   Total: ${log.total_processed}`);
      console.log(`   Added: ${log.added_count}`);
      console.log(`   Updated: ${log.updated_count}`);
      console.log(`   Failed: ${log.failed_count}`);
      console.log(`   Duration: ${log.duration_ms}ms`);
    });
  } else {
    console.log('ℹ️  No property listing sync logs found (table may not exist)');
  }
}

checkAutoSyncLogs();
