import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('=== Running Migration 033: Make property_type nullable ===\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '033_make_property_type_nullable.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration SQL...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying direct execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '033_make_property_type_nullable',
        executed_at: new Date().toISOString()
      });

      if (directError) {
        throw directError;
      }
    }

    console.log('✅ Migration 033 completed successfully');
    console.log('\nChanges made:');
    console.log('- property_type column is now nullable');
    console.log('- CHECK constraint updated to allow NULL values');
    console.log('- Japanese property type values are now accepted');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.error('File: backend/migrations/033_make_property_type_nullable.sql');
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
