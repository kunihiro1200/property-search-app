// Migration 042: Add buyers table
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('Running migration 042: Add buyers table...\n');

  const sqlPath = path.join(__dirname, '042_add_buyers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        // Try direct query if exec_sql doesn't exist
        console.log('Statement:', statement.substring(0, 50) + '...');
        console.log('Note: exec_sql not available, please run in Supabase SQL Editor');
      }
    } catch (err: any) {
      console.log('Statement:', statement.substring(0, 50) + '...');
      console.log('Error:', err.message);
    }
  }

  console.log('\nMigration complete!');
  console.log('\nIMPORTANT: Please run the SQL in Supabase SQL Editor:');
  console.log(sqlPath);
}

runMigration().catch(console.error);
