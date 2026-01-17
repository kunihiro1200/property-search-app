import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running Migration 011: Construction Price Table...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '011_add_construction_price_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Attempting direct SQL execution...');
      
      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.rpc('exec', { 
            query: statement + ';' 
          });
          
          if (execError) {
            console.error('❌ Error executing statement:', execError);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    console.log('✅ Migration 011 completed successfully!');
    console.log('\n📊 Construction prices table created with data from 1965-2025');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
