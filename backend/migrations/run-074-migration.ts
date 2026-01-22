import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration 074: Add rate limit log table...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '074_add_rate_limit_log.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      
      if (directError) {
        throw new Error(`Migration failed: ${error.message}`);
      }

      // Split and execute statements one by one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (stmtError) {
          console.error(`Statement failed: ${stmtError.message}`);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration 074 completed successfully');
    console.log('Created rate_limit_log table with indexes');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
