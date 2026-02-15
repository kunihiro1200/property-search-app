import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAA2022WorkTask() {
  console.log('AA2022の業務タスクデータを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
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

  console.log('=== AA2022のデータ ===\n');

  // 売買契約関連のフィールドを確認
  const importantFields = [
    'property_number',
    'sales_contract_deadline',
    'sales_contract_confirmed',
    'binding_scheduled_date',
    'binding_completed',
    'settlement_date',
    'accounting_confirmed',
    'on_hold',
    'hirose_request_sales',
    'cw_request_sales',
    'employee_contract_creation',
    'cw_completed_email_sales',
    'work_completed_chat_hirose',
    'sales_contract_assignee',
  ];

  importantFields.forEach(field => {
    const value = (data as any)[field];
    console.log(`${field}:`);
    console.log(`  値: ${value === null ? '(null)' : value === undefined ? '(undefined)' : value === '' ? '(空文字)' : `"${value}"`}`);
    console.log(`  型: ${typeof value}`);
    console.log();
  });

  // calculateSidebarCategoryロジックを再現
  console.log('=== カテゴリ判定 ===\n');

  const isBlank = (value: any): boolean => {
    return value === null || value === undefined || value === '';
  };

  const isNotBlank = (value: any): boolean => {
    return !isBlank(value);
  };

  console.log('条件チェック:');
  console.log(`1. sales_contract_confirmed === '確認中': ${data.sales_contract_confirmed === '確認中'}`);
  console.log(`   sales_contract_confirmed の値: "${data.sales_contract_confirmed}"`);
  console.log();

  console.log(`2. 売買契約 依頼未の条件:`);
  console.log(`   - sales_contract_deadline が空でない: ${isNotBlank(data.sales_contract_deadline)}`);
  console.log(`   - binding_scheduled_date が空: ${isBlank(data.binding_scheduled_date)}`);
  console.log(`   - binding_completed が空: ${isBlank(data.binding_completed)}`);
  console.log(`   - on_hold が空: ${isBlank(data.on_hold)}`);
  console.log(`   - hirose_request_sales が空: ${isBlank(data.hirose_request_sales)}`);
  console.log(`   - cw_request_sales が空: ${isBlank(data.cw_request_sales)}`);
  console.log();

  console.log(`3. 売買契約 入力待ちの条件:`);
  console.log(`   - sales_contract_deadline が空でない: ${isNotBlank(data.sales_contract_deadline)}`);
  console.log(`   - binding_scheduled_date が空: ${isBlank(data.binding_scheduled_date)}`);
  console.log(`   - on_hold が空: ${isBlank(data.on_hold)}`);
  console.log(`   - binding_completed が空: ${isBlank(data.binding_completed)}`);
  console.log(`   - hirose/cw/employee のいずれかが空でない: ${isNotBlank(data.hirose_request_sales) || isNotBlank(data.cw_request_sales) || isNotBlank(data.employee_contract_creation)}`);
  console.log(`   - accounting_confirmed が空: ${isBlank(data.accounting_confirmed)}`);
  console.log(`   - cw_completed_email_sales が空 OR work_completed_chat_hirose が空: ${isBlank(data.cw_completed_email_sales) || isBlank(data.work_completed_chat_hirose)}`);
}

checkAA2022WorkTask().catch(console.error);
