import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkLastSyncedColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('PostgreSQLに接続しました\n');

    // buyersテーブルのカラム情報を取得
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'buyers'
      ORDER BY ordinal_position;
    `);

    console.log(`buyersテーブルのカラム数: ${result.rows.length}\n`);

    // last_synced_atカラムを検索
    const lastSyncedColumn = result.rows.find(row => 
      row.column_name === 'last_synced_at'
    );

    if (lastSyncedColumn) {
      console.log('✓ last_synced_atカラムが存在します');
      console.log('  データ型:', lastSyncedColumn.data_type);
      console.log('  NULL許可:', lastSyncedColumn.is_nullable);
    } else {
      console.log('✗ last_synced_atカラムが存在しません');
      console.log('\n類似のカラム名:');
      result.rows
        .filter(row => row.column_name.includes('sync') || row.column_name.includes('updated'))
        .forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
    }

    // synced_atカラムを検索
    const syncedAtColumn = result.rows.find(row => 
      row.column_name === 'synced_at'
    );

    if (syncedAtColumn) {
      console.log('\n✓ synced_atカラムが存在します');
      console.log('  データ型:', syncedAtColumn.data_type);
      console.log('  NULL許可:', syncedAtColumn.is_nullable);
    }

    // db_updated_atカラムを検索
    const dbUpdatedAtColumn = result.rows.find(row => 
      row.column_name === 'db_updated_at'
    );

    if (dbUpdatedAtColumn) {
      console.log('\n✓ db_updated_atカラムが存在します');
      console.log('  データ型:', dbUpdatedAtColumn.data_type);
      console.log('  NULL許可:', dbUpdatedAtColumn.is_nullable);
    }

    // 全カラムをリスト表示
    console.log('\n\n全カラムリスト:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.end();
  }
}

checkLastSyncedColumn().catch(console.error);
