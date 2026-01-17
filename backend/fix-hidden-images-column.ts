// hidden_imagesカラムを追加するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addHiddenImagesColumn() {
  console.log('🔧 hidden_imagesカラムを追加中...\n');

  try {
    // SQLを直接実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- hidden_imagesカラムを追加
        ALTER TABLE property_listings 
        ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

        -- コメントを追加
        COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

        -- インデックスを追加（配列検索用）
        CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
        ON property_listings USING GIN (hidden_images);
      `
    });

    if (error) {
      console.error('❌ エラー:', error.message);
      console.log('\n💡 代替方法: Supabase Dashboardで以下のSQLを直接実行してください:\n');
      console.log('```sql');
      console.log('ALTER TABLE property_listings');
      console.log("ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
      console.log('');
      console.log("COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';");
      console.log('');
      console.log('CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images');
      console.log('ON property_listings USING GIN (hidden_images);');
      console.log('```\n');
      return;
    }

    console.log('✅ hidden_imagesカラムを追加しました！');
    console.log('✅ インデックスを作成しました！');
    
    // 確認
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1);

    if (checkError) {
      console.error('⚠️ 確認中にエラー:', checkError.message);
    } else {
      console.log('\n✅ カラムが正常に追加されたことを確認しました！');
    }
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.log('\n💡 Supabase Dashboardで以下のSQLを直接実行してください:\n');
    console.log('```sql');
    console.log('ALTER TABLE property_listings');
    console.log("ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
    console.log('');
    console.log("COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';");
    console.log('');
    console.log('CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images');
    console.log('ON property_listings USING GIN (hidden_images);');
    console.log('```\n');
  }
}

addHiddenImagesColumn();
