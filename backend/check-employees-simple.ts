/**
 * employeesテーブルを簡単に確認
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkEmployees() {
  console.log('🔍 employeesテーブルを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // データを取得
  const { data, error, count } = await supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    return;
  }

  console.log(`✅ employeesテーブルは存在します`);
  console.log(`📊 総件数: ${count} 件\n`);

  if (data && data.length > 0) {
    console.log('✅ カラム一覧:');
    console.log(Object.keys(data[0]).sort().join('\n'));
    console.log('\n📝 サンプルデータ:');
    console.log(data[0]);
  } else {
    console.log('⚠️  データが0件です');
  }
}

checkEmployees();
