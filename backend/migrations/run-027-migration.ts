import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Running migration 027: Make address nullable\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '027_make_address_nullable.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution if RPC doesn't work
      console.log('⚠️  RPC method not available, trying direct execution...\n');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        const { error: execError } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (execError) {
          console.error(`❌ Error executing statement: ${execError.message}`);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 027 completed successfully!\n');
    console.log('📝 Changes:');
    console.log('   - Made address column nullable in sellers table');
    console.log('   - This allows migration of records without address information\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Please run this SQL manually in Supabase SQL Editor:');
    console.error('   ALTER TABLE sellers ALTER COLUMN address DROP NOT NULL;\n');
    process.exit(1);
  }
}

runMigration();
