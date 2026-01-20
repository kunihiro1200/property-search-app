import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🚀 マイグレーション095を実行中...');
  console.log('   物件リストテーブルにimage_urlsカラムを追加\n');

  try {
    // Step 1: カラムを追加
    console.log('📝 Step 1: image_urlsカラムを追加...');
    const { error: alterError } = await supabase.rpc('exec_raw_sql', {
      query: `
        ALTER TABLE property_listings
        ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
      `
    });

    if (alterError) {
      // exec_raw_sqlが存在しない場合、直接テーブルを更新して確認
      console.log('   RPC関数が存在しないため、直接確認します...');
      
      // テストクエリでカラムの存在を確認
      const { data: testData, error: testError } = await supabase
        .from('property_listings')
        .select('id, property_number, image_urls')
        .limit(1);

      if (testError && testError.message.includes('image_urls')) {
        console.error('❌ image_urlsカラムが存在しません');
        console.log('\n📋 以下のSQLを手動で実行してください:');
        console.log('---');
        console.log(`
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN property_listings.image_urls IS '物件の画像URL配列（Google Driveから取得してキャッシュ）';

CREATE INDEX IF NOT EXISTS idx_property_listings_image_urls ON property_listings USING GIN (image_urls);
        `);
        console.log('---');
        process.exit(1);
      } else if (!testError) {
        console.log('✅ image_urlsカラムは既に存在します');
      }
    } else {
      console.log('✅ image_urlsカラムを追加しました');
    }

    // Step 2: 確認
    console.log('\n📝 Step 2: カラムの存在を確認...');
    const { data, error: checkError } = await supabase
      .from('property_listings')
      .select('id, property_number, image_urls')
      .limit(3);

    if (checkError) {
      console.error('❌ 確認クエリ失敗:', checkError);
      process.exit(1);
    }

    console.log('✅ image_urlsカラムが正常に動作しています');
    console.log('   サンプルデータ:');
    data?.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.property_number}: ${JSON.stringify(row.image_urls)}`);
    });

    console.log('\n✅ マイグレーション095が正常に完了しました');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

runMigration();
