import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  console.log('🚀 マイグレーション086を実行中（直接PostgreSQL接続）...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ データベースに接続しました\n');

    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, '086_add_inquiry_sync_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 マイグレーションSQLを実行中...\n');

    // SQLを実行
    await client.query(sql);
    
    console.log('✅ マイグレーションが正常に実行されました');

    // 検証: カラムが追加されたか確認
    console.log('\n🔍 検証中...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_inquiries'
      AND column_name IN (
        'sheet_sync_status',
        'sheet_sync_error_message',
        'sheet_row_number',
        'sheet_synced_at',
        'sync_retry_count'
      )
      ORDER BY column_name;
    `);

    if (result.rows.length > 0) {
      console.log('✅ 追加されたカラム:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})${row.column_default ? ` DEFAULT ${row.column_default}` : ''}`);
      });
    } else {
      console.log('⚠️ カラムが見つかりませんでした');
    }

    // インデックスの確認
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'property_inquiries'
      AND indexname = 'idx_property_inquiries_sync_status';
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n✅ 追加されたインデックス:');
      indexResult.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    } else {
      console.log('\n⚠️ インデックスが見つかりませんでした');
    }

    console.log('\n✅ マイグレーション086が完了しました！');
    console.log('\n📋 サマリー:');
    console.log('  - sheet_sync_status カラムを追加');
    console.log('  - sheet_sync_error_message カラムを追加');
    console.log('  - sheet_row_number カラムを追加');
    console.log('  - sheet_synced_at カラムを追加');
    console.log('  - sync_retry_count カラムを追加');
    console.log('  - idx_property_inquiries_sync_status インデックスを追加');

  } catch (error) {
    console.error('\n❌ マイグレーション実行エラー:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
