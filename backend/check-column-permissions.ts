import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumnPermissions() {
  console.log('=== Checking hidden_images Column Permissions ===\n');

  // 1. カラムの存在確認
  const { data: columnCheck, error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `
  });

  console.log('1. Column Existence Check:');
  console.log(columnCheck || columnError);
  console.log('');

  // 2. テーブルの権限確認
  const { data: tablePrivileges, error: privError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT grantee, privilege_type
      FROM information_schema.table_privileges
      WHERE table_name = 'property_listings'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres');
    `
  });

  console.log('2. Table Privileges:');
  console.log(tablePrivileges || privError);
  console.log('');

  // 3. カラムレベルの権限確認
  const { data: columnPrivileges, error: colPrivError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT grantee, privilege_type, column_name
      FROM information_schema.column_privileges
      WHERE table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `
  });

  console.log('3. Column-Level Privileges:');
  console.log(columnPrivileges || colPrivError);
  console.log('');

  // 4. PostgRESTが使用するスキーマの確認
  const { data: schemaCheck, error: schemaError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'property_listings';
    `
  });

  console.log('4. Table Schema:');
  console.log(schemaCheck || schemaError);
  console.log('');

  // 5. 実際にデータを取得してみる
  console.log('5. Attempting to fetch data with hidden_images:');
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, hidden_images')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Success:', data);
  }
}

checkColumnPermissions().catch(console.error);
