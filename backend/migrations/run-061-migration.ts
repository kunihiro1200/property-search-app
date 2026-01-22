import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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
    console.log('Starting migration 061: Add template fields to email_history...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '061_add_template_fields_to_email_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration 061 completed successfully');
    console.log('Added columns:');
    console.log('  - template_id (VARCHAR(100))');
    console.log('  - template_name (VARCHAR(200))');
    console.log('  - Index on template_id');

  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
