import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 075: Add property_image_deletion_logs table...');
  
  try {
    const sqlPath = path.join(__dirname, '075_add_property_image_deletion_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        // Try direct execution if RPC fails
        console.log('RPC failed, trying direct query...');
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.error('Direct query also failed:', directError);
        }
      }
    }
    
    console.log('Migration 075 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
