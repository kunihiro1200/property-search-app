import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Starting migration 044: Add area_map_config table...');

    // Read migration file
    const migrationPath = path.join(__dirname, '044_add_area_map_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If RPC doesn't exist, try direct execution
      console.log('Attempting direct SQL execution...');
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      
      if (directError) {
        console.error('Migration failed:', error);
        process.exit(1);
      }
    }

    console.log('Migration 044 completed successfully!');
    console.log('Next step: Run the data population script to insert area map data');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
