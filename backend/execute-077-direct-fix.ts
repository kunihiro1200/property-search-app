/**
 * マイグレーション077を直接PostgreSQLで実行
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URLが設定されていません');
  process.exit(1);
}

async function executeMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');
    
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // マイグレーションSQLを読み込み
    const migrationPath = path.join(__dirname, 'migrations', '077_add_hidden_images_to_property_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('実行するSQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    // SQLを実行
    console.log('マイグレーションを実行中...');
    await client.query(migrationSQL);
    console.log('✅ マイグレーションが正常に実行されました\n');

    // 確認
    console.log('カラムの存在を確認中...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ hidden_imagesカラムが正常に追加されました:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ hidden_imagesカラムが見つかりません');
    }

    // 既存レコードの確認
    console.log('\n既存レコードのhidden_images値を確認中...');
    const dataCheck = await client.query(`
      SELECT id, property_number, hidden_images
      FROM property_listings
      LIMIT 5;
    `);

    console.log('\nサンプルデータ:');
    dataCheck.rows.forEach(row => {
      console.log(`- ${row.property_number}: ${JSON.stringify(row.hidden_images)}`);
    });

    // PostgRESTスキーマキャッシュをリロード
    console.log('\nPostgRESTスキーマキャッシュをリロード中...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ スキーマキャッシュをリロードしました');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ データベース接続を閉じました');
  }
}

executeMigration().catch(console.error);
