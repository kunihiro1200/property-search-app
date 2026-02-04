import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkUsers() {
  console.log('🔍 従業員一覧を確認...\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, email, name, initials')
    .limit(5);

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('✅ 従業員一覧:');
  employees?.forEach(emp => {
    console.log(`  - ${emp.email} (${emp.name || emp.initials})`);
  });
}

checkUsers();
