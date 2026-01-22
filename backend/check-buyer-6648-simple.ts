import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkBuyer6648Simple() {
  console.log('=== 買主6648シンプル確認 ===\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. スキーマリロードを実行
    console.log('1. スキーマリロードを実行...');
    await pool.query("NOTIFY pgrst, 'reload schema';");
    console.log('✓ NOTIFY pgrst実行完了\n');

    // 2秒待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. 買主6648を検索
    console.log('2. 買主6648を検索...');
    const result = await pool.query(
      'SELECT * FROM buyers WHERE buyer_number = $1',
      ['6648']
    );

    if (result.rows.length > 0) {
      console.log('✓ 買主6648が見つかりました:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('○ 買主6648は見つかりませんでした（新規作成が必要）');
    }

    // 3. buyersテーブルのスキーマを確認
    console.log('\n3. buyersテーブルのカラムを確認...');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'buyers'
      ORDER BY ordinal_position;
    `);

    console.log('buyersテーブルのカラム:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });

    // 4. 買主6647と6648の比較
    console.log('\n4. 買主6647と6648の比較...');
    const comparison = await pool.query(`
      SELECT buyer_number, name, email, phone, created_at, updated_at
      FROM buyers
      WHERE buyer_number IN ('6647', '6648')
      ORDER BY buyer_number;
    `);

    if (comparison.rows.length > 0) {
      console.log('買主6647と6648:');
      comparison.rows.forEach(row => {
        console.log(`  買主${row.buyer_number}:`, {
          name: row.name,
          email: row.email,
          phone: row.phone
        });
      });
    } else {
      console.log('買主6647または6648が見つかりません');
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await pool.end();
  }

  console.log('\n=== 確認完了 ===');
}

checkBuyer6648Simple().catch(console.error);
