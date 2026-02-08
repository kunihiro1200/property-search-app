import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setAdmin() {
  console.log('=== 国広智子さんをAdminに設定 ===\n');
  
  // 国広智子さんを取得
  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select('*')
    .eq('initials', 'K')
    .single();
  
  if (fetchError || !employee) {
    console.error('国広智子さんが見つかりません:', fetchError);
    return;
  }
  
  console.log('対象ユーザー:');
  console.log(`  名前: ${employee.name}`);
  console.log(`  イニシャル: ${employee.initials}`);
  console.log(`  現在のRole: ${employee.role}`);
  console.log('');
  
  // roleをadminに更新
  const { data: updated, error: updateError } = await supabase
    .from('employees')
    .update({ role: 'admin' })
    .eq('id', employee.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }
  
  console.log('✅ 更新成功');
  console.log(`  新しいRole: ${updated.role}`);
  console.log('');
  console.log('バックエンドサーバーを再起動してください。');
}

setAdmin();
