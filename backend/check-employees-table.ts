/**
 * employeesテーブルの存在とカラムを確認
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkEmployeesTable() {
  console.log('🔍 employeesテーブルを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // テーブルの存在確認
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'employees');

  if (tablesError) {
    console.error('❌ テーブル確認エラー:', tablesError.message);
  }

  if (!tables || tables.length === 0) {
    console.log('❌ employeesテーブルが存在しません');
    return;
  }

  console.log('✅ employeesテーブルは存在します\n');

  // データを取得してカラムを確認
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ データ取得エラー:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ employeesテーブルのカラム:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  } else {
    console.log('⚠️  employeesテーブルにデータがありません');
    
    // カラム情報を別の方法で取得
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'employees'
    });

    if (columnsError) {
      console.log('カラム情報を取得できませんでした');
    }
  }

  // 件数確認
  const { count, error: countError } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📊 総件数: ${count} 件`);
  }
}

checkEmployeesTable();
