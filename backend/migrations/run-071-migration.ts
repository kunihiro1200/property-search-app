import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration 071: Add buyer field sync monitoring tables...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '071_add_buyer_field_sync_monitoring.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If RPC doesn't exist, try direct execution
      console.log('RPC method not available, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', { 
          query: statement 
        });
        
        if (execError) {
          console.error('Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 071 completed successfully');
    console.log('Created tables:');
    console.log('  - buyer_field_sync_logs');
    console.log('  - buyer_data_recovery_logs');
    console.log('Created indexes for efficient querying');

  } catch (error) {
    console.error('❌ Migration 071 failed:', error);
    process.exit(1);
  }
}

runMigration();
