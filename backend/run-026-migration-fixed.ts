import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // 修正: SUPABASE_SERVICE_KEY を使用

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error(`SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Not set'}`);
  console.error(`SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? 'Set' : 'Not set'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration 026: Add sync logs...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '026_add_sync_logs.sql'),
      'utf8'
    );

    // SQLを個別のステートメントに分割して実行
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length === 0) continue;
      
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      });

      if (error) {
        // テーブルが既に存在する場合はスキップ
        if (error.message.includes('already exists')) {
          console.log('  ⚠️  Already exists, skipping...');
          continue;
        }
        console.error('  ❌ Error:', error);
        throw error;
      }
      
      console.log('  ✅ Success');
    }

    console.log('\n✓ Migration 026 completed successfully');
  } catch (error: any) {
    console.error('\n❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
