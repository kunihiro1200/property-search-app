import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 マイグレーション 084 を実行中...');
    console.log('📍 property_listingsテーブルに緯度・経度カラムを追加します\n');

    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, '084_add_coordinates_to_property_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // マイグレーションを実行
    await client.query(migrationSQL);

    console.log('✅ マイグレーション 084 が正常に完了しました！\n');
    console.log('📋 追加されたカラム:');
    console.log('  - latitude (DECIMAL(10, 8))');
    console.log('  - longitude (DECIMAL(11, 8))');
    console.log('  - インデックス: idx_property_listings_coordinates\n');
    console.log('🗺️ 次のステップ:');
    console.log('  1. Google Geocoding APIで既存物件の座標を取得');
    console.log('  2. バックエンドAPIで座標を返すように修正');
    console.log('  3. フロントエンドで地図表示を確認\n');

  } catch (error: any) {
    console.error('❌ マイグレーション実行中にエラーが発生しました:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
