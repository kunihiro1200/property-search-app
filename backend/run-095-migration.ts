import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🚀 マイグレーション095を実行中...');
  console.log('   物件リストテーブルにimage_urlsカラムを追加');

  try {
    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'migrations', '095_add_image_urls_to_property_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // SQLを実行
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ マイグレーション失敗:', error);
      process.exit(1);
    }

    console.log('✅ マイグレーション095が正常に完了しました');
    
    // 確認
    const { data, error: checkError } = await supabase
      .from('property_listings')
      .select('id, property_number, image_urls')
      .limit(1);

    if (checkError) {
      console.error('❌ 確認クエリ失敗:', checkError);
    } else {
      console.log('✅ image_urlsカラムが正常に追加されました');
      console.log('   サンプルデータ:', data);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

runMigration();
