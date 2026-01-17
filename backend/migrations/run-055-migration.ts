import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Starting migration 055: Add buyer_number to viewings table...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '055_add_buyer_number_to_viewings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✓ Migration 055 completed successfully');
    console.log('  - Added buyer_number column to viewings table');
    console.log('  - Created index on buyer_number');
    console.log('  - Updated existing records with current buyer numbers');

  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
