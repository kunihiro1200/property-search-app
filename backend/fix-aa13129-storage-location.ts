import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

// 環境変数を読み込む
config({ path: './backend/.env' });

async function fixAA13129StorageLocation() {
  console.log('=== AA13129の格納先URLを更新 ===\n');

  const storageUrl = 'https://drive.google.com/drive/folders/1nbVqT3XejIfpUIUpsG5d2GAL3To3KV7H?usp=sharing';
  const propertyNumber = 'AA13129';

  // PostgreSQL接続
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 現在の状態を確認
    console.log('📋 現在の状態を確認中...\n');
    const checkResult = await pool.query(
      'SELECT property_number, storage_location FROM property_listings WHERE property_number = $1',
      [propertyNumber]
    );

    if (checkResult.rows.length === 0) {
      console.log('❌ AA13129がproperty_listingsテーブルに見つかりません');
      return;
    }

    console.log('現在のstorage_location:', checkResult.rows[0].storage_location || '(NULL)');
    console.log('');

    // storage_locationを更新
    console.log('🔄 storage_locationを更新中...\n');
    const updateResult = await pool.query(
      'UPDATE property_listings SET storage_location = $1 WHERE property_number = $2 RETURNING property_number, storage_location',
      [storageUrl, propertyNumber]
    );

    if (updateResult.rows.length > 0) {
      console.log('✅ 更新成功！\n');
      console.log('更新後のデータ:');
      console.log(`  物件番号: ${updateResult.rows[0].property_number}`);
      console.log(`  格納先URL: ${updateResult.rows[0].storage_location}`);
      console.log('');
      console.log('💡 次のステップ:');
      console.log('  1. フロントエンドでAA13129の物件詳細ページを開く');
      console.log('  2. 画像が正しく表示されることを確認');
      console.log('  3. 他の物件でも同様の問題がないか確認');
    } else {
      console.log('❌ 更新に失敗しました');
    }

  } catch (error: any) {
    console.log('❌ エラー:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }

  console.log('\n=== 修正完了 ===');
}

fixAA13129StorageLocation().catch(console.error);
