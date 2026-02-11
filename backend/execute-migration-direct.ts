import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Executing migration: add_field_updated_at_columns\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260211_add_field_updated_at_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Migration SQL:');
    console.log('---');
    console.log(sql);
    console.log('---\n');
    
    console.log('⚠️  Please execute this SQL manually in Supabase Studio:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');
    console.log('');
    console.log('After execution, run: npx ts-node backend/verify-field-updated-at-columns.ts');
    
  } catch (error) {
    console.error('❌ Failed to read migration file:', error);
    process.exit(1);
  }
}

executeMigration();
