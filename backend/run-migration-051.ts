// マイグレーション051を実行（Supabase経由）
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== マイグレーション051実行 ===\n');

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', '051_add_buyers_sync_columns.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('実行するSQL:');
  console.log(sql);
  console.log('');

  // Execute migration
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ マイグレーション失敗:', error.message);
    console.log('\n⚠️  Supabase SQL Editorで直接実行してください:\n');
    console.log(sql);
    process.exit(1);
  }

  console.log('✅ マイグレーション051が正常に実行されました\n');

  // Verify the column was added
  console.log('カラムの存在を確認中...\n');

  const { error: verifyError } = await supabase
    .from('buyers')
    .select('last_synced_at')
    .limit(1);

  if (verifyError) {
    console.error('❌ 確認失敗:', verifyError.message);
  } else {
    console.log('✅ last_synced_atカラムが正常に追加されました\n');
  }
}

runMigration().catch(console.error);
