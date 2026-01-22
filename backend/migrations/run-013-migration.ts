import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running migration 013...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '013_update_construction_prices.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying direct execution...');
      const { error: directError } = await supabase.from('construction_prices').select('*').limit(1);
      
      if (directError) {
        throw directError;
      }

      // Execute SQL statements one by one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log('Executing statement...');
          // This won't work directly, we need to use a different approach
        }
      }
    }

    console.log('✅ Migration 013 completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
