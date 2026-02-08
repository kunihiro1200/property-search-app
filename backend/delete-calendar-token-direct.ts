import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteToken() {
  console.log('=== 古いカレンダートークンを削除（直接SQL） ===\n');
  
  // tenant@ifoo-oita.com のemployee_idを取得
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('email', 'tenant@ifoo-oita.com')
    .single();
  
  if (!employee) {
    console.log('❌ tenant@ifoo-oita.com が見つかりません');
    return;
  }
  
  console.log('対象アカウント:', employee.email);
  console.log('Employee ID:', employee.id);
  console.log('');
  
  // 直接SQLで削除
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `DELETE FROM google_calendar_tokens WHERE employee_id = '${employee.id}'`
  });
  
  if (error) {
    console.error('削除エラー:', error);
    
    // RPCが存在しない場合は、RESTで削除を試みる
    console.log('');
    console.log('代替方法: Supabase Dashboardで以下のSQLを実行してください:');
    console.log('');
    console.log(`DELETE FROM google_calendar_tokens WHERE employee_id = '${employee.id}';`);
    console.log('');
    return;
  }
  
  console.log('✅ 古いトークンを削除しました');
  console.log('');
  console.log('次のステップ:');
  console.log('1. ブラウザで http://localhost:3000/api/auth/google/calendar にアクセス');
  console.log('2. tenant@ifoo-oita.com でログイン');
  console.log('3. カレンダーへのアクセスを許可');
  console.log('');
  console.log('注意: Gmailの権限は影響を受けません');
}

deleteToken();
