import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('🔍 Migration 081診断開始...\n');

  // 1. propertiesテーブルの存在確認
  console.log('1️⃣ propertiesテーブルの存在確認');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'properties');

  if (tablesError) {
    console.log('❌ テーブル確認エラー:', tablesError.message);
  } else if (tables && tables.length > 0) {
    console.log('✅ propertiesテーブルは存在します');
    
    // 2. カラム一覧を取得
    console.log('\n2️⃣ propertiesテーブルのカラム一覧');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'properties')
      .order('ordinal_position');

    if (columnsError) {
      console.log('❌ カラム確認エラー:', columnsError.message);
    } else if (columns) {
      console.log('カラム数:', columns.length);
      columns.forEach(col => {
        const marker = col.column_name === 'construction_year' ? '👉' : '  ';
        console.log(`${marker} ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });

      // 3. construction_yearカラムの存在確認
      const hasConstructionYear = columns.some(col => col.column_name === 'construction_year');
      console.log('\n3️⃣ construction_yearカラムの存在確認');
      if (hasConstructionYear) {
        console.log('✅ construction_yearカラムは存在します');
      } else {
        console.log('❌ construction_yearカラムが見つかりません！');
      }
    }
  } else {
    console.log('❌ propertiesテーブルが存在しません');
    console.log('\n📋 推奨される対処法:');
    console.log('1. テーブルが存在しない場合、マイグレーションを実行してください');
    console.log('2. 既存のpropertiesテーブルがある場合、DROP TABLE IF EXISTS properties CASCADE; を実行してから再度マイグレーションを実行してください');
  }

  // 4. valuationsテーブルの確認
  console.log('\n4️⃣ valuationsテーブルの存在確認');
  const { data: valuationsTables, error: valuationsError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'valuations');

  if (valuationsError) {
    console.log('❌ テーブル確認エラー:', valuationsError.message);
  } else if (valuationsTables && valuationsTables.length > 0) {
    console.log('✅ valuationsテーブルは存在します');
  } else {
    console.log('⚠️  valuationsテーブルが存在しません');
  }

  // 5. 外部キー制約の確認
  console.log('\n5️⃣ 外部キー制約の確認');
  const { data: constraints, error: constraintsError } = await supabase.rpc('get_table_constraints', {
    table_name: 'properties'
  }).catch(() => ({ data: null, error: { message: 'RPC関数が存在しません（正常）' } }));

  if (constraints) {
    console.log('制約:', constraints);
  } else {
    console.log('ℹ️  制約情報の取得をスキップ');
  }

  console.log('\n✅ 診断完了');
}

diagnose().catch(console.error);
