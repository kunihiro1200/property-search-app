// hidden_imagesカラムを強制的に追加するスクリプト
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
    // RPC経由でSQLを実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- hidden_imagesカラムを追加
        ALTER TABLE property_listings 
        ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

        -- コメントを追加
        COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

        -- インデックスを追加
        CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
        ON property_listings USING GIN (hidden_images);
      `
    });

    if (error) {
      console.error('❌ RPC経由での実行に失敗しました:', error.message);
      console.log('\n💡 代替方法を試します...\n');
      
      // 代替方法: 直接PostgreSQL接続を使用
      await addColumnDirectly();
    } else {
      console.log('✅ hidden_imagesカラムの追加に成功しました！');
      await verifyColumn();
    }
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.log('\n💡 手動での実行が必要です。以下のSQLをSupabase Dashboardで実行してください:\n');
    console.log('```sql');
    console.log("ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
    console.log('```\n');
  }
}

async function addColumnDirectly() {
  console.log('🔧 PostgreSQL直接接続で追加を試みます...\n');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query(`
      ALTER TABLE property_listings 
      ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';
    `);
    
    await pool.query(`
      COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
      ON property_listings USING GIN (hidden_images);
    `);

    console.log('✅ PostgreSQL直接接続での追加に成功しました！');
    await verifyColumn();
  } catch (error: any) {
    console.error('❌ PostgreSQL直接接続でも失敗しました:', error.message);
    console.log('\n⚠️ Supabase Dashboardで手動実行が必要です');
  } finally {
    await pool.end();
  }
}

async function verifyColumn() {
  console.log('\n🔍 カラムの存在を確認中...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ 確認エラー:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    if (columns.includes('hidden_images')) {
      console.log('✅ hidden_imagesカラムが正常に追加されました！');
      console.log(`\n📊 現在のカラム数: ${columns.length}`);
    } else {
      console.log('❌ hidden_imagesカラムがまだ存在しません');
    }
  }
}

addHiddenImagesColumn();
