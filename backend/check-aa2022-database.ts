import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAA2022Database() {
  console.log('データベースのAA2022データを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // work_tasksテーブルからAA2022を取得
  const { data, error } = await supabase
    .from('work_tasks')
    .select('*')
    .eq('property_number', 'AA2022')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!data) {
    console.log('AA2022が見つかりません');
    return;
  }

  console.log('=== AA2022のデータベースデータ ===\n');

  // 重要なフィールドを表示
  const importantFields = [
    'property_number',
    'hirose_request_sales',
    'cw_request_sales',
    'sales_contract_comment',
    'work_completed_comment',
    'hirose_completed_chat_sales',
    'cw_completed_chat_sales',
    'completed_comment_sales',
    'employee_contract_creation',
    'work_content',
  ];

  importantFields.forEach(field => {
    const value = data[field];
    console.log(`${field}:`);
    console.log(`  値: "${value}"`);
    console.log(`  型: ${typeof value}`);
    console.log(`  NULL: ${value === null}`);
    console.log();
  });

  // 全フィールドを表示（デバッグ用）
  console.log('\n=== 全フィールド ===\n');
  Object.keys(data).sort().forEach(key => {
    if (!importantFields.includes(key)) {
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`${key}: ${value}`);
      }
    }
  });
}

checkAA2022Database().catch(console.error);
