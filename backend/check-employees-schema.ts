/**
 * 従業員テーブルのスキーマを確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 従業員テーブルのスキーマを確認 ===\n');

  // 全従業員を取得（全カラム）
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .order('initials');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (employees && employees.length > 0) {
    console.log('カラム一覧:', Object.keys(employees[0]));
    console.log('\n全従業員データ:');
    employees.forEach(e => {
      console.log(JSON.stringify(e, null, 2));
    });
  }
}

main().catch(console.error);
