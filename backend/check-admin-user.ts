import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAdminUser() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 管理者ユーザーを確認中...\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', 'admin@example.com');

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!employees || employees.length === 0) {
    console.log('❌ admin@example.com が見つかりません');
    console.log('\n📋 全従業員を表示:');
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, name, email, is_active')
      .limit(10);
    console.table(allEmployees);
  } else {
    console.log('✅ 管理者ユーザーが見つかりました:');
    console.table(employees);
  }
}

checkAdminUser();
