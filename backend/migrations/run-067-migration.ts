import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration 067: Update sync_logs status constraint...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '067_update_sync_logs_status_constraint.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Migration 067 completed successfully!');
    console.log('\n📋 Changes:');
    console.log('  - Updated sync_logs.status constraint');
    console.log('  - Allowed values: pending, in_progress, success, error');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
