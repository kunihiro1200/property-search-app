import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', '104_add_buyer_logical_deletion.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration 104: Add Buyer Logical Deletion...');

  // Execute migration using direct SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration 104 executed successfully');
  console.log('- Added deleted_at column to buyers table');
  console.log('- Created buyer_deletion_audit table');
  console.log('- Created indexes for query performance');
}

runMigration().catch(console.error);
