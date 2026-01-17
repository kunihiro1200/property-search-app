/**
 * マイグレーション077を直接PostgreSQLで実行
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function executeMigration() {
  console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'migrations', '077_add_hidden_images_to_property_listings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('マイグレーションSQLを実行中...\n');
    console.log(sql);
    console.log();

    // SQLを実行
    await client.query(sql);

    console.log('✅ マイグレーションが正常に完了しました\n');

    // 確認
    console.log('カラムの存在を確認中...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `);

    if (result.rows.length > 0) {
      console.log('✅ hidden_imagesカラムが正常に追加されました:');
      console.log(result.rows[0]);
    } else {
      console.log('⚠️  hidden_imagesカラムが見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ データベース接続を閉じました');
  }
}

executeMigration().catch(console.error);
