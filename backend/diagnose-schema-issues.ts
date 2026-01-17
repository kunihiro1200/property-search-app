import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseSchemaIssues() {
  console.log('🔍 スキーマ診断を開始します...\n');

  // 1. sellers テーブルのカラムを確認
  console.log('1️⃣ sellers テーブルのカラムを確認:');
  const { data: sellerColumns, error: sellerError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'sellers')
    .like('column_name', '%delete%');

  if (sellerError) {
    console.error('❌ エラー:', sellerError);
  } else {
    console.log('削除関連のカラム:', sellerColumns);
  }

  // 2. sync_logs テーブルの存在確認
  console.log('\n2️⃣ sync_logs テーブルの存在確認:');
  const { data: syncLogsTable, error: syncLogsError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'sync_logs');

  if (syncLogsError) {
    console.error('❌ エラー:', syncLogsError);
  } else {
    console.log('sync_logs テーブル:', syncLogsTable?.length ? '存在します' : '存在しません');
  }

  // 3. sync_health テーブルの存在確認
  console.log('\n3️⃣ sync_health テーブルの存在確認:');
  const { data: syncHealthTable, error: syncHealthError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'sync_health');

  if (syncHealthError) {
    console.error('❌ エラー:', syncHealthError);
  } else {
    console.log('sync_health テーブル:', syncHealthTable?.length ? '存在します' : '存在しません');
  }

  // 4. buyers テーブルの last_synced_at カラム確認
  console.log('\n4️⃣ buyers テーブルの last_synced_at カラム確認:');
  const { data: buyerColumns, error: buyerError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'buyers')
    .like('column_name', '%sync%');

  if (buyerError) {
    console.error('❌ エラー:', buyerError);
  } else {
    console.log('同期関連のカラム:', buyerColumns);
  }

  // 5. 実行済みマイグレーションの確認
  console.log('\n5️⃣ 実行済みマイグレーションの確認:');
  const { data: migrations, error: migrationsError } = await supabase
    .from('schema_migrations')
    .select('version')
    .in('version', ['054', '068'])
    .order('version');

  if (migrationsError) {
    console.error('❌ エラー:', migrationsError);
  } else {
    console.log('実行済みマイグレーション:', migrations);
  }

  console.log('\n✅ 診断完了');
}

diagnoseSchemaIssues().catch(console.error);
