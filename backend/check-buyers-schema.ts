import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBuyersSchema() {
  console.log('=== buyersテーブルのスキーマ確認 ===\n');

  try {
    // 1件だけ取得してカラム名を確認
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('エラー:', error.message);
      
      // テーブルが空の場合、スキーマ情報を取得
      console.log('\nテーブルが空またはエラーです。PostgreSQLから直接スキーマを確認してください。');
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`カラム数: ${columns.length}`);
      console.log('\nカラム一覧:');
      columns.sort().forEach((col, index) => {
        console.log(`${(index + 1).toString().padStart(3)}: ${col}`);
      });
    } else {
      console.log('テーブルにデータがありません');
    }
  } catch (error: any) {
    console.error('予期しないエラー:', error.message);
  }
}

checkBuyersSchema();
