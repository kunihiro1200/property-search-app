import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function addHiddenImagesColumn() {
  console.log('=== PostgreSQL直接接続でhidden_imagesカラムを追加 ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // カラムの存在確認
    console.log('1. カラムの存在確認...');
    const checkQuery = `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  hidden_imagesカラムは既に存在します:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ hidden_imagesカラムが存在しません。追加します...\n');
      
      // カラムを追加
      console.log('2. カラムを追加中...');
      const addColumnQuery = `
        ALTER TABLE public.property_listings 
        ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
      `;
      
      await client.query(addColumnQuery);
      console.log('✅ hidden_imagesカラムを追加しました\n');
      
      // 再確認
      console.log('3. 追加されたカラムを確認...');
      const verifyResult = await client.query(checkQuery);
      console.log('カラム情報:', verifyResult.rows[0]);
    }

    // テストデータで確認
    console.log('\n4. テストクエリを実行...');
    const testQuery = `
      SELECT id, property_number, hidden_images
      FROM public.property_listings
      LIMIT 3;
    `;
    
    const testResult = await client.query(testQuery);
    console.log('✅ テストクエリ成功:');
    console.log(testResult.rows);

    console.log('\n✅ すべての処理が完了しました');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ データベース接続を閉じました');
  }
}

addHiddenImagesColumn().catch(console.error);
