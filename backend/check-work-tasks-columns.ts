import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkWorkTasksColumns() {
  console.log('work_tasksテーブルのカラムを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // AA2022のデータを取得してカラムを確認
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

  console.log('=== 確認対象カラム ===\n');

  const columnsToCheck = [
    'sales_materials_drive',
    'work_completed_comment',
    'cw_completed_chat_sales',
    'kunihiro_chat',
    'yamamoto_chat',
    'ura_chat',
    'kadoi_chat',
  ];

  columnsToCheck.forEach(column => {
    const exists = column in data;
    const value = data[column];
    console.log(`${column}:`);
    console.log(`  存在: ${exists ? '✅' : '❌'}`);
    if (exists) {
      console.log(`  値: "${value}"`);
      console.log(`  型: ${typeof value}`);
    }
    console.log();
  });

  console.log('\n=== 全カラム一覧 ===\n');
  Object.keys(data).sort().forEach(key => {
    console.log(`- ${key}`);
  });
}

checkWorkTasksColumns().catch(console.error);
