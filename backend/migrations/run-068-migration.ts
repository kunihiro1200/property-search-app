import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 068: Create Sync Monitoring Tables');
  console.log('================================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '068_create_sync_monitoring_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📝 Executing SQL...\n');

    // Execute the migration using Supabase client
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', {
          sql: statement + ';'
        });
        
        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying table creation...\n');

    const tables = ['sync_logs', 'error_logs', 'sync_health'];
    
    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        console.error(`❌ Error accessing ${table}:`, tableError.message);
      } else {
        console.log(`✅ ${table} table is accessible`);
      }
    }

    console.log('\n================================================');
    console.log('✅ Migration 068 completed successfully!');
    console.log('================================================\n');

    console.log('📋 Next steps:');
    console.log('1. Verify tables in Supabase Dashboard');
    console.log('2. Run check-sync-tables-simple.ts to confirm');
    console.log('3. Test sync operations\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n📋 Troubleshooting:');
    console.error('1. Check Supabase connection');
    console.error('2. Verify service role key permissions');
    console.error('3. Try running SQL directly in Supabase SQL Editor\n');
    process.exit(1);
  }
}

runMigration();
