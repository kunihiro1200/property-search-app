import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function revertBuyerAssignee() {
  console.log('=== 買主6951の後続担当を元に戻す ===\n');
  
  // 後続担当をnullに戻す
  const { data, error } = await supabase
    .from('buyers')
    .update({
      follow_up_assignee: null
    })
    .eq('buyer_number', '6951')
    .select()
    .single();
  
  if (error) {
    console.error('❌ 更新エラー:', error);
    return;
  }
  
  console.log('✅ 買主6951の後続担当を元に戻しました\n');
  console.log('=== 更新後のデータ ===');
  console.log('買主番号:', data.buyer_number);
  console.log('後続担当:', data.follow_up_assignee);
  console.log('次電日:', data.next_call_date);
  console.log('更新日:', data.updated_at);
}

revertBuyerAssignee().catch(console.error);
