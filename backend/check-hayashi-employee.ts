import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== 「林」さんの情報を確認 ===\n');
  
  // 全従業員を取得
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, initials, is_active')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('エラー:', error);
    return;
  }
  
  console.log('アクティブな従業員一覧:');
  console.log('');
  
  for (const employee of employees || []) {
    // 名前に「林」が含まれているか確認
    if (employee.name.includes('林')) {
      console.log('✅ 「林」さんを発見:');
      console.log(`  名前: ${employee.name}`);
      console.log(`  メール: ${employee.email || 'なし'}`);
      console.log(`  イニシャル（DB）: ${employee.initials || 'なし'}`);
      console.log(`  ID: ${employee.id}`);
      console.log('');
    }
  }
  
  console.log('全従業員のイニシャル一覧:');
  console.log('');
  
  for (const employee of employees || []) {
    console.log(`  ${employee.initials || '?'} - ${employee.name} (${employee.email || 'メールなし'})`);
  }
}

check();
