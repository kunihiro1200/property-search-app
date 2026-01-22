import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration 012: Make prefecture and city nullable...');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '012_make_prefecture_city_nullable.sql'),
      'utf8'
    );

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', { 
          query: statement 
        });
        
        if (execError) {
          console.error('❌ Migration failed:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 012 completed successfully!');
    console.log('');
    console.log('Changes applied:');
    console.log('  - Made prefecture column nullable in properties table');
    console.log('  - Made city column nullable in properties table');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
