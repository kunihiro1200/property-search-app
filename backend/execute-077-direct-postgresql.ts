/**
 * マイグレーション077を PostgreSQL に直接接続して実行
 * 
 * 前提条件:
 * - .env ファイルで DATABASE_URL が設定されていること
 * - pg パッケージがインストールされていること
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL が設定されていません');
  console.error('');
  console.error('.env ファイルで以下の行のコメントを外してください:');
  console.error('DATABASE_URL=postgresql://postgres:Y4MxYv8nnv0adDgT@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
  console.error('');
  console.error('または、Supabase SQL Editor で直接実行してください。');
  console.error('詳細は HIDDEN_IMAGES_REAL_SOLUTION.md を参照してください。');
  process.exit(1);
}

async function executeMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('=== マイグレーション077: hidden_imagesカラム追加 ===\n');
    console.log('PostgreSQL に直接接続して実行します...\n');

    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, 'migrations', '077_add_hidden_images_MANUAL_EXECUTION.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('SQL を実行中...');
    await pool.query(sql);
    
    console.log('\n✅ マイグレーションが正常に完了しました\n');

    // 確認クエリ
    console.log('カラムの存在を確認中...');
    const checkResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_listings'
        AND column_name = 'hidden_images'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ hidden_imagesカラムが正常に追加されました');
      console.log('\nカラム情報:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ hidden_imagesカラムが見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('\n詳細:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeMigration().catch(console.error);
