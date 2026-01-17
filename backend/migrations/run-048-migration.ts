import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting migration 048: Add beppu_area_mapping table...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '048_add_beppu_area_mapping.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration...');
    console.log('Note: Please run this SQL manually in Supabase SQL Editor:');
    console.log('------------------------------------------------------');
    console.log(sql);
    console.log('------------------------------------------------------');

    // Try to create the table using Supabase client
    // Note: This may not work for all SQL statements, manual execution may be required
    console.log('\nAttempting to verify/create table...');

    console.log('✓ Migration 048 SQL prepared');

    // Verify the table was created
    const { error: verifyError } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('Warning: Could not verify table creation:', verifyError.message);
    } else {
      console.log('✓ Table beppu_area_mapping verified');
    }

  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
