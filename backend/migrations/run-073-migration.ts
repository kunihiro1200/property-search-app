// マイグレーション073を実行
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== マイグレーション073を実行 ===\n');

  try {
    // SQLファイルを読み込み
    const sqlPath = path.join(__dirname, '073_add_site_display_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // マイグレーションを実行
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // rpc関数が存在しない場合は、直接実行を試みる
      console.log('⚠️  rpc関数が使用できません。直接実行を試みます...');
      
      // SQLを分割して実行
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log(`実行中: ${statement.substring(0, 50)}...`);
          const { error: execError } = await supabase.rpc('exec', { 
            query: statement 
          });
          
          if (execError) {
            console.error(`❌ エラー: ${execError.message}`);
            console.log('\n手動実行が必要です。以下のSQLをSupabase SQLエディタで実行してください:');
            console.log('\n' + sql);
            return;
          }
        }
      }
    }

    console.log('✅ マイグレーション073が正常に完了しました');
    console.log('\n次のステップ:');
    console.log('1. Supabase SQLエディタで以下のSQLを実行してください:');
    console.log('\n' + sql);
    console.log('\n2. 実行後、テストを再実行してください');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.log('\n手動実行が必要です。以下のSQLをSupabase SQLエディタで実行してください:');
    const sqlPath = path.join(__dirname, '073_add_site_display_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('\n' + sql);
  }
}

runMigration();
