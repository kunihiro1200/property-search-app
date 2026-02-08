import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('環境変数が設定されていません');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('=== 生野陸斗さんの情報確認 ===\n');
  
  // 生野陸斗さんの情報を確認
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('initials', '生')
    .single();
  
  if (employeeError) {
    console.error('従業員情報取得エラー:', employeeError);
    return;
  }
  
  console.log('従業員情報:');
  console.log('  ID:', employee.id);
  console.log('  名前:', employee.name);
  console.log('  イニシャル:', employee.initials);
  console.log('  メールアドレス:', employee.email);
  console.log('');
  
  // カレンダートークンを確認
  const { data: token, error: tokenError } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('employee_id', employee.id)
    .single();
  
  if (tokenError && tokenError.code !== 'PGRST116') {
    console.error('トークン取得エラー:', tokenError);
  }
  
  console.log('カレンダートークン:', token ? '✅ 存在する' : '❌ 存在しない');
  
  if (token) {
    console.log('  トークンID:', token.id);
    console.log('  作成日:', token.created_at);
    console.log('  更新日:', token.updated_at);
  }
  console.log('');
  
  // 全てのカレンダートークンを確認
  const { data: allTokens } = await supabase
    .from('google_calendar_tokens')
    .select('employee_id, created_at');
  
  console.log('=== 全体の状況 ===');
  console.log('登録済みカレンダートークン数:', allTokens?.length || 0);
  
  if (allTokens && allTokens.length > 0) {
    console.log('\n登録済み従業員:');
    for (const t of allTokens) {
      const { data: emp } = await supabase
        .from('employees')
        .select('name, initials, email')
        .eq('id', t.employee_id)
        .single();
      
      if (emp) {
        console.log(`  - ${emp.name} (${emp.initials}) - ${emp.email}`);
      }
    }
  }
}

check().catch(console.error);
