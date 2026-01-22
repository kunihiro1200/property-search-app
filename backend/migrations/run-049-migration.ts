// マイグレーション049を実行
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('=== マイグレーション049を実行 ===\n');
    
    const sqlPath = path.join(__dirname, '049_fix_buyer_text_field_lengths.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('SQL実行中...\n');
    
    // SQLを個別のステートメントに分割して実行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        throw error;
      }
    }
    
    console.log('✅ マイグレーション049が正常に完了しました\n');
    console.log('多数のフィールドがTEXT型に変更されました');
    
  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error('\n手動でSupabase SQLエディタから以下のSQLを実行してください:');
    console.error('\n' + fs.readFileSync(path.join(__dirname, '049_fix_buyer_text_field_lengths.sql'), 'utf8'));
    process.exit(1);
  }
}

runMigration();
