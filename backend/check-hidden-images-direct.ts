import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkHiddenImagesColumn() {
  const client = await pool.connect();
  
  try {
    console.log('=== PostgreSQL直接接続でhidden_imagesカラムを確認 ===\n');

    // 1. カラムの存在確認
    console.log('1. カラムの存在確認...');
    const columnCheck = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_listings'
        AND column_name = 'hidden_images';
    `);

    if (columnCheck.rows.length === 0) {
      console.error('✗ hidden_imagesカラムが見つかりません！');
      console.log('\n全カラムを表示:');
      const allColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'property_listings'
        ORDER BY ordinal_position;
      `);
      allColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('✓ hidden_imagesカラムが存在します:');
      console.log(columnCheck.rows[0]);
    }

    // 2. インデックスの確認
    console.log('\n2. インデックスの確認...');
    const indexCheck = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'property_listings'
        AND indexname LIKE '%hidden_images%';
    `);

    if (indexCheck.rows.length === 0) {
      console.log('✗ hidden_images用のインデックスが見つかりません');
    } else {
      console.log('✓ インデックスが存在します:');
      indexCheck.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
        console.log(`    ${row.indexdef}`);
      });
    }

    // 3. テーブルのコメント確認
    console.log('\n3. カラムコメントの確認...');
    const commentCheck = await client.query(`
      SELECT
        col_description('property_listings'::regclass, ordinal_position) as comment
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_listings'
        AND column_name = 'hidden_images';
    `);

    if (commentCheck.rows.length > 0 && commentCheck.rows[0].comment) {
      console.log('✓ カラムコメント:', commentCheck.rows[0].comment);
    } else {
      console.log('✗ カラムコメントが設定されていません');
    }

    // 4. 実際のデータでテスト
    console.log('\n4. 実際のデータでテスト...');
    const dataTest = await client.query(`
      SELECT id, hidden_images
      FROM property_listings
      LIMIT 1;
    `);

    console.log('✓ データ取得成功:');
    console.log(dataTest.rows);

    // 5. マイグレーション077の実行確認
    console.log('\n5. マイグレーション077の実行確認...');
    const migrationCheck = await client.query(`
      SELECT * FROM schema_migrations
      WHERE version = '077'
      ORDER BY executed_at DESC
      LIMIT 1;
    `);

    if (migrationCheck.rows.length === 0) {
      console.error('✗ マイグレーション077が実行されていません！');
    } else {
      console.log('✓ マイグレーション077は実行済み:');
      console.log(migrationCheck.rows[0]);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHiddenImagesColumn().then(() => {
  console.log('\n=== 確認完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('実行エラー:', error);
  process.exit(1);
});
