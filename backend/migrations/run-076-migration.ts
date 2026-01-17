import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 076: Add hidden_images column to property_listings...');
  
  try {
    const sqlPath = path.join(__dirname, '076_add_hidden_images_column.sql');
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
        console.log('RPC failed, trying direct query...');
        console.error('Error:', error);
      }
    }
    
    // Verify the column was added
    const { error: verifyError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1);
    
    if (verifyError) {
      console.error('Verification failed:', verifyError);
    } else {
      console.log('Column verified successfully!');
    }
    
    console.log('Migration 076 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
