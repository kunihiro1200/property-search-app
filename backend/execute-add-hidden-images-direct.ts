import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function executeDirectSQL() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== 直接SQLでhidden_imagesカラムを追加 ===\n');

  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, 'add-hidden-images-column-direct.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('実行するSQL:');
    console.log(sql);
    console.log('\n実行中...\n');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ エラーが発生しました:', error);
      
      // RPCが使えない場合は、直接PostgreSQLクライアントを使用
      console.log('\n⚠️  RPCが使えないため、pg クライアントで直接実行します...\n');
      
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      await client.connect();
      
      const result = await client.query(sql);
      console.log('✅ SQLを実行しました');
      console.log('結果:', result);
      
      await client.end();
    } else {
      console.log('✅ SQLを実行しました');
      console.log('結果:', data);
    }

    // 確認クエリ
    console.log('\n=== カラムの確認 ===\n');
    const { data: columns, error: checkError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1);

    if (checkError) {
      console.error('❌ 確認エラー:', checkError);
    } else {
      console.log('✅ hidden_imagesカラムが正常に追加されました');
      console.log('サンプルデータ:', columns);
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  }
}

executeDirectSQL();
