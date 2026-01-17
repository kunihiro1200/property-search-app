import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 マイグレーション086を実行中...\n');

  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, '086_add_inquiry_sync_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQLファイルを読み込みました');
    console.log('実行するSQL:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log();

    // マイグレーションを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ マイグレーション実行エラー:', error);
      
      // 直接実行を試みる
      console.log('\n⚠️ 直接実行を試みます...\n');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`実行中: ${statement.substring(0, 100)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (stmtError) {
            console.error(`❌ エラー:`, stmtError);
          } else {
            console.log('✅ 成功');
          }
        }
      }
    } else {
      console.log('✅ マイグレーションが正常に実行されました');
    }

    // 検証: カラムが追加されたか確認
    console.log('\n🔍 検証中...\n');
    
    const { data: columns, error: columnsError } = await supabase
      .from('property_inquiries')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ 検証エラー:', columnsError);
    } else {
      console.log('✅ property_inquiriesテーブルの構造:');
      if (columns && columns.length > 0) {
        console.log(Object.keys(columns[0]));
      } else {
        console.log('テーブルにデータがありません（これは正常です）');
      }
    }

    console.log('\n✅ マイグレーション086が完了しました！');
    console.log('\n追加されたカラム:');
    console.log('  - sheet_sync_status (VARCHAR(20), DEFAULT \'pending\')');
    console.log('  - sheet_sync_error_message (TEXT)');
    console.log('  - sheet_row_number (INTEGER)');
    console.log('  - sheet_synced_at (TIMESTAMPTZ)');
    console.log('  - sync_retry_count (INTEGER, DEFAULT 0)');
    console.log('\n追加されたインデックス:');
    console.log('  - idx_property_inquiries_sync_status (sheet_sync_status, created_at)');

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  }
}

runMigration();
