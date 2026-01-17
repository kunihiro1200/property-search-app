import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixHiddenImagesDirectConnection() {
  // DATABASE_URLから直接接続
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 PostgreSQLに直接接続中...');
    await client.connect();
    console.log('✅ 接続成功');

    // 1. 現在の状態を確認
    console.log('\n📊 現在の状態を確認:');
    const checkColumn = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
        AND column_name = 'hidden_images';
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('⚠️  hidden_imagesカラムは既に存在します:');
      console.log(checkColumn.rows[0]);
      console.log('\n🗑️  既存のカラムを削除してから再作成します...');
      
      // 既存のインデックスを削除
      await client.query(`
        DROP INDEX IF EXISTS idx_property_listings_hidden_images;
      `);
      console.log('✅ インデックスを削除しました');
      
      // 既存のカラムを削除
      await client.query(`
        ALTER TABLE property_listings DROP COLUMN IF EXISTS hidden_images;
      `);
      console.log('✅ カラムを削除しました');
    } else {
      console.log('ℹ️  hidden_imagesカラムは存在しません（期待通り）');
    }

    // 2. カラムを追加
    console.log('\n➕ hidden_imagesカラムを追加中...');
    await client.query(`
      ALTER TABLE property_listings 
      ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
    `);
    console.log('✅ カラムを追加しました');

    // 3. コメントを追加
    console.log('\n💬 コメントを追加中...');
    await client.query(`
      COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';
    `);
    console.log('✅ コメントを追加しました');

    // 4. インデックスを追加
    console.log('\n🔍 インデックスを追加中...');
    await client.query(`
      CREATE INDEX idx_property_listings_hidden_images 
      ON property_listings USING GIN (hidden_images);
    `);
    console.log('✅ インデックスを追加しました');

    // 5. 権限を付与
    console.log('\n🔐 権限を付与中...');
    await client.query(`
      GRANT SELECT, UPDATE ON property_listings TO authenticated;
    `);
    await client.query(`
      GRANT SELECT, UPDATE ON property_listings TO anon;
    `);
    console.log('✅ 権限を付与しました');

    // 6. 確認
    console.log('\n✅ 最終確認:');
    const finalCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
        AND column_name = 'hidden_images';
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('✅ hidden_imagesカラムが正常に作成されました:');
      console.log(finalCheck.rows[0]);
    } else {
      console.log('❌ エラー: カラムが作成されませんでした');
    }

    // 7. PostgRESTに通知（これは効果がないかもしれませんが、念のため）
    console.log('\n📢 PostgRESTに通知中...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('✅ 通知を送信しました');

    console.log('\n🎉 完了！');
    console.log('\n⚠️  重要: Supabaseプロジェクトを再起動してください:');
    console.log('   1. Supabase Dashboard → Settings → General');
    console.log('   2. "Pause project" をクリック');
    console.log('   3. 1-2分待つ');
    console.log('   4. "Resume project" をクリック');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 接続を切断しました');
  }
}

fixHiddenImagesDirectConnection();
