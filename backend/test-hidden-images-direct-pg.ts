import { Client } from 'pg';

/**
 * PostgRESTをバイパスして、直接PostgreSQLに接続してhidden_imagesをテスト
 * これによりスキーマキャッシュの問題を回避できます
 */
async function testHiddenImagesDirectPg() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQLに直接接続しました');

    // 1. カラムの存在を確認
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_listings'
        AND column_name = 'hidden_images'
    `);

    if (columnCheck.rows.length === 0) {
      console.error('❌ hidden_imagesカラムが見つかりません');
      return;
    }

    console.log('✅ hidden_imagesカラムが存在します:', columnCheck.rows[0]);

    // 2. テストデータを取得
    const testProperty = await client.query(`
      SELECT id, property_number, hidden_images
      FROM property_listings
      WHERE property_number = 'AA13129'
      LIMIT 1
    `);

    if (testProperty.rows.length === 0) {
      console.error('❌ テスト物件が見つかりません');
      return;
    }

    const property = testProperty.rows[0];
    console.log('📋 現在の状態:', {
      id: property.id,
      property_number: property.property_number,
      hidden_images: property.hidden_images,
    });

    // 3. 画像を非表示にする
    const fileIdToHide = '17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA';
    const currentHidden = property.hidden_images || [];
    
    if (!currentHidden.includes(fileIdToHide)) {
      const newHidden = [...currentHidden, fileIdToHide];
      
      await client.query(
        `UPDATE property_listings 
         SET hidden_images = $1 
         WHERE id = $2`,
        [newHidden, property.id]
      );

      console.log('✅ 画像を非表示にしました:', fileIdToHide);
    } else {
      console.log('ℹ️ 画像は既に非表示です');
    }

    // 4. 更新後の状態を確認
    const updated = await client.query(
      `SELECT hidden_images FROM property_listings WHERE id = $1`,
      [property.id]
    );

    console.log('✅ 更新後の hidden_images:', updated.rows[0].hidden_images);

    // 5. 画像を再表示する
    const newHidden = (updated.rows[0].hidden_images || []).filter(
      (id: string) => id !== fileIdToHide
    );

    await client.query(
      `UPDATE property_listings 
       SET hidden_images = $1 
       WHERE id = $2`,
      [newHidden, property.id]
    );

    console.log('✅ 画像を再表示しました');

    // 6. 最終状態を確認
    const final = await client.query(
      `SELECT hidden_images FROM property_listings WHERE id = $1`,
      [property.id]
    );

    console.log('✅ 最終的な hidden_images:', final.rows[0].hidden_images);
    console.log('\n🎉 すべてのテストが成功しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await client.end();
  }
}

testHiddenImagesDirectPg();
