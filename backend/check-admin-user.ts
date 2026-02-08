import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== Admin ユーザーの確認 ===\n');
  
  // role='admin'のユーザーを確認
  const { data: admins, error } = await supabase
    .from('employees')
    .select('*')
    .eq('role', 'admin');
  
  if (error) {
    console.error('エラー:', error);
    return;
  }
  
  console.log('Admin ユーザー数:', admins?.length || 0);
  
  if (admins && admins.length > 0) {
    console.log('\nAdmin ユーザー一覧:');
    admins.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.initials})`);
      console.log(`    ID: ${admin.id}`);
      console.log(`    Email: ${admin.email}`);
      console.log(`    Role: ${admin.role}`);
      console.log('');
    });
  } else {
    console.log('\n❌ Admin ユーザーが見つかりません');
    console.log('\n全ユーザーのroleを確認:');
    
    const { data: allUsers } = await supabase
      .from('employees')
      .select('name, initials, role, email')
      .limit(10);
    
    if (allUsers) {
      allUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.initials}) - Role: ${user.role || '未設定'}`);
      });
    }
  }
}

check();
