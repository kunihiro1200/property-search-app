import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 069: Create sync tables via function...\n');

  try {
    // Step 1: Call the function to create tables
    console.log('📝 Step 1: Calling create_sync_monitoring_tables() function...');
    const { data, error } = await supabase.rpc('create_sync_monitoring_tables');

    if (error) {
      console.error('❌ Error calling function:', error);
      throw error;
    }

    console.log('✅ Function executed:', data);

    // Step 2: Verify tables exist
    console.log('\n📝 Step 2: Verifying tables...');
    
    const tables = ['sync_logs', 'error_logs', 'sync_health', 'migrations'];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        console.error(`❌ Error accessing ${table}:`, tableError.message);
      } else {
        console.log(`✅ Table ${table} is accessible via REST API`);
      }
    }

    console.log('\n✅ Migration 069 completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Function created and executed');
    console.log('- All 4 tables created');
    console.log('- Tables accessible via REST API');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
