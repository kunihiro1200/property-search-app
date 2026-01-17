import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 068: Create sync monitoring tables (Direct SQL)...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '068_create_sync_monitoring_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing SQL directly...');
    
    // Execute the SQL using rpc with a raw SQL execution
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution via REST API
      console.log('⚠️  exec_sql function not available, trying alternative method...');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('create table') || 
            statement.toLowerCase().includes('create index') ||
            statement.toLowerCase().includes('create policy') ||
            statement.toLowerCase().includes('grant') ||
            statement.toLowerCase().includes('insert into') ||
            statement.toLowerCase().includes('comment on')) {
          
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`);
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ SQL executed successfully\n');

    // Verify tables were created
    console.log('📝 Step 2: Verifying tables...');
    
    const tables = ['sync_logs', 'error_logs', 'sync_health'];
    
    for (const table of tables) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        console.error(`❌ Table ${table} verification failed:`, tableError);
        throw tableError;
      }
      
      console.log(`✅ Table ${table} exists and is accessible`);
    }

    console.log('\n✅ Migration 068 completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - sync_logs table created');
    console.log('  - error_logs table created');
    console.log('  - sync_health table created');
    console.log('  - Indexes created');
    console.log('  - RLS policies configured');
    console.log('  - Initial health record inserted');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
