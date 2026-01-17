/**
 * Migration 036: データ整合性制約の追加
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('=== Migration 036: データ整合性制約の追加 ===\n');

  const sqlPath = path.join(__dirname, '036_add_data_integrity_constraints.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('SQLを実行中...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('マイグレーションエラー:', error.message);
    console.log('\n注意: Supabaseの管理画面からSQLを直接実行してください。');
    console.log('SQLファイル:', sqlPath);
    return;
  }

  console.log('✅ マイグレーション完了');
}

runMigration().catch(console.error);
