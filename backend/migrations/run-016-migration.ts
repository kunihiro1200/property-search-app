import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running migration 016: Update calendar tokens for company account...');

    // Read SQL file
    const sqlPath = path.join(__dirname, '016_update_calendar_tokens_for_company_account.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If RPC doesn't exist, try direct execution
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', { 
          query: statement 
        });
        
        if (execError) {
          console.error('Error executing statement:', statement);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 016 completed successfully');
    console.log('');
    console.log('次のステップ:');
    console.log('1. バックエンドを再起動');
    console.log('2. 「会社アカウントでGOOGLEカレンダーを接続」ボタンをクリック');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
