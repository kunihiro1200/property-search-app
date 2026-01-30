import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('🔄 手入力査定額カラムを追加します...\n');

  try {
    // マイグレーションSQLを読み込む
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260130_add_manual_valuation_amounts.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 実行するSQL:');
    console.log(sql);
    console.log('');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ マイグレーションに失敗:', error);
      
      // 直接実行を試みる
      console.log('\n🔄 直接実行を試みます...');
      
      const { error: directError } = await supabase
        .from('sellers')
        .select('id')
        .limit(1);
      
      if (directError) {
        console.error('❌ 接続エラー:', directError);
        return;
      }

      // 手動でカラムを追加
      console.log('⚠️ RPC経由での実行に失敗しました');
      console.log('📋 以下のSQLをSupabase Studioで手動実行してください:');
      console.log('');
      console.log(sql);
      return;
    }

    console.log('✅ マイグレーション完了!');
    console.log('');

    // 確認
    const { data: columns } = await supabase
      .from('sellers')
      .select('manual_valuation_amount_1')
      .limit(1);

    if (columns) {
      console.log('✅ manual_valuation_amount_1カラムが追加されました');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

runMigration();
