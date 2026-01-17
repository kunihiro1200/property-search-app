import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSellersTable() {
  console.log('🔍 sellersテーブルの存在確認...\n');

  try {
    // 1. テーブルの存在確認
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'sellers');

    if (tablesError) {
      console.error('❌ テーブル情報の取得エラー:', tablesError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.error('❌ sellersテーブルが存在しません！');
      console.log('\n📋 マイグレーション001を実行する必要があります。');
      return;
    }

    console.log('✅ sellersテーブルが存在します\n');

    // 2. カラム情報の確認
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'sellers')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ カラム情報の取得エラー:', columnsError);
      return;
    }

    console.log('📊 sellersテーブルのカラム一覧:');
    console.log('─'.repeat(60));
    columns?.forEach((col: any) => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'}`);
    });
    console.log('─'.repeat(60));

    // 3. 主キーの確認
    const { data: constraints, error: constraintsError } = await supabase.rpc('get_table_constraints', {
      table_name: 'sellers'
    });

    if (!constraintsError && constraints) {
      console.log('\n🔑 主キー情報:');
      console.log(constraints);
    }

    // 4. レコード数の確認
    const { count, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ レコード数の取得エラー:', countError);
    } else {
      console.log(`\n📈 sellersテーブルのレコード数: ${count}件`);
    }

    console.log('\n✅ sellersテーブルの確認完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkSellersTable();
