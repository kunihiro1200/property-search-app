import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseTableVisibility() {
  console.log('=== テーブル可視性診断 ===\n');

  // 1. PostgreSQL直接接続でテーブル情報を確認
  console.log('1. PostgreSQL直接: property_listingsテーブルの詳細情報');
  const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE tablename = 'property_listings';
    `
  });
  
  if (tableError) {
    console.log('❌ テーブル情報取得エラー:', tableError);
  } else {
    console.log('✅ テーブル情報:', JSON.stringify(tableInfo, null, 2));
  }

  // 2. テーブルの権限を確認
  console.log('\n2. property_listingsテーブルの権限');
  const { data: permissions, error: permError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        grantee,
        privilege_type
      FROM information_schema.table_privileges
      WHERE table_name = 'property_listings'
      ORDER BY grantee, privilege_type;
    `
  });
  
  if (permError) {
    console.log('❌ 権限確認エラー:', permError);
  } else {
    console.log('✅ テーブル権限:', JSON.stringify(permissions, null, 2));
  }

  // 3. PostgRESTが使用するロールの権限を確認
  console.log('\n3. authenticatorロールとanonロールの権限');
  const { data: rolePerms, error: roleError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        r.rolname,
        ARRAY_AGG(p.privilege_type) as privileges
      FROM pg_roles r
      LEFT JOIN information_schema.table_privileges p 
        ON r.rolname = p.grantee 
        AND p.table_name = 'property_listings'
      WHERE r.rolname IN ('authenticator', 'anon', 'authenticated', 'service_role')
      GROUP BY r.rolname;
    `
  });
  
  if (roleError) {
    console.log('❌ ロール権限エラー:', roleError);
  } else {
    console.log('✅ ロール権限:', JSON.stringify(rolePerms, null, 2));
  }

  // 4. PostgRESTの設定を確認
  console.log('\n4. PostgRESTスキーマ設定');
  const { data: pgSettings, error: settingsError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT name, setting 
      FROM pg_settings 
      WHERE name LIKE '%search_path%' OR name LIKE '%pgrst%';
    `
  });
  
  if (settingsError) {
    console.log('❌ 設定確認エラー:', settingsError);
  } else {
    console.log('✅ PostgreSQL設定:', JSON.stringify(pgSettings, null, 2));
  }

  // 5. hidden_imagesカラムの存在確認
  console.log('\n5. hidden_imagesカラムの存在確認');
  const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'property_listings'
        AND column_name = 'hidden_images';
    `
  });
  
  if (columnError) {
    console.log('❌ カラム確認エラー:', columnError);
  } else {
    console.log('✅ hidden_imagesカラム:', JSON.stringify(columnInfo, null, 2));
  }

  // 6. PostgREST APIでテーブルが見えるか確認
  console.log('\n6. PostgREST API経由でのテーブルアクセステスト');
  try {
    const { data, error } = await supabase
      .from('property_listings')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ PostgREST APIエラー:', error);
    } else {
      console.log('✅ PostgREST APIでテーブルにアクセス可能');
      console.log('   データ件数:', data?.length || 0);
    }
  } catch (e) {
    console.log('❌ 例外:', e);
  }

  // 7. RLSポリシーの確認
  console.log('\n7. Row Level Security (RLS) ポリシー');
  const { data: rlsInfo, error: rlsError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'property_listings';
    `
  });
  
  if (rlsError) {
    console.log('❌ RLSポリシー確認エラー:', rlsError);
  } else {
    console.log('✅ RLSポリシー:', JSON.stringify(rlsInfo, null, 2));
  }
}

diagnoseTableVisibility().catch(console.error);
