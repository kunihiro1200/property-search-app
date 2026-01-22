import { Client } from 'pg';

async function addHiddenImagesColumn() {
  // 直接PostgreSQLに接続（PostgRESTをバイパス）
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQLに直接接続しました');

    // 1. カラムが既に存在するか確認
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'property_listings' 
      AND column_name = 'hidden_images'
    `);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  hidden_imagesカラムは既に存在します:', checkResult.rows[0]);
      
      // カラムを削除して再作成
      console.log('🔄 カラムを削除して再作成します...');
      await client.query(`
        ALTER TABLE property_listings 
        DROP COLUMN IF EXISTS hidden_images CASCADE
      `);
      console.log('✅ 既存のカラムを削除しました');
    }

    // 2. カラムを追加
    console.log('➕ hidden_imagesカラムを追加します...');
    await client.query(`
      ALTER TABLE property_listings 
      ADD COLUMN hidden_images TEXT[] DEFAULT '{}'::TEXT[]
    `);
    console.log('✅ hidden_imagesカラムを追加しました');

    // 3. コメントを追加
    await client.query(`
      COMMENT ON COLUMN property_listings.hidden_images 
      IS '非表示にする画像のファイル名リスト'
    `);
    console.log('✅ カラムコメントを追加しました');

    // 4. 確認
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'property_listings' 
      AND column_name = 'hidden_images'
    `);
    
    console.log('\n📋 追加されたカラム情報:');
    console.log(verifyResult.rows[0]);

    // 5. PostgRESTにスキーマリロードを通知
    console.log('\n🔄 PostgRESTにスキーマリロードを通知します...');
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('✅ 通知を送信しました');

    console.log('\n✅ 完了！10-30秒待ってからAPIをテストしてください。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addHiddenImagesColumn();
