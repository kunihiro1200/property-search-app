import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setup() {
  console.log('=== tenant@ifoo-oita.com アカウントのセットアップ ===\n');
  
  // tenant@ifoo-oita.com が存在するか確認
  const { data: existing, error: fetchError } = await supabase
    .from('employees')
    .select('*')
    .eq('email', 'tenant@ifoo-oita.com')
    .single();
  
  if (existing) {
    console.log('✅ tenant@ifoo-oita.com は既に存在します');
    console.log(`  ID: ${existing.id}`);
    console.log(`  名前: ${existing.name}`);
    console.log(`  Role: ${existing.role}`);
    
    // roleがadminでない場合は更新
    if (existing.role !== 'admin') {
      console.log('\nroleをadminに更新中...');
      const { error: updateError } = await supabase
        .from('employees')
        .update({ role: 'admin' })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('更新エラー:', updateError);
      } else {
        console.log('✅ roleをadminに更新しました');
      }
    }
  } else {
    console.log('tenant@ifoo-oita.com が見つかりません。新規作成します。\n');
    
    // 新規作成
    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert({
        name: '会社アカウント',
        initials: 'tenant',
        email: 'tenant@ifoo-oita.com',
        role: 'admin',
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('作成エラー:', insertError);
    } else {
      console.log('✅ tenant@ifoo-oita.com を作成しました');
      console.log(`  ID: ${newEmployee.id}`);
      console.log(`  名前: ${newEmployee.name}`);
      console.log(`  Role: ${newEmployee.role}`);
    }
  }
  
  console.log('\n次のステップ:');
  console.log('1. ブラウザで http://localhost:3000/api/auth/google/calendar にアクセス');
  console.log('2. tenant@ifoo-oita.com でログイン');
  console.log('3. カレンダーへのアクセスを許可');
}

setup();
