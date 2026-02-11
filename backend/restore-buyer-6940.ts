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

async function restoreBuyer() {
  console.log('=== 買主6940の復元 ===\n');
  
  // 削除フラグをクリア
  const { data, error } = await supabase
    .from('buyers')
    .update({
      deleted_at: null
    })
    .eq('buyer_number', '6940')
    .select()
    .single();
  
  if (error) {
    console.error('❌ 復元エラー:', error);
    return;
  }
  
  console.log('✅ 買主6940を復元しました\n');
  console.log('=== 復元後のデータ ===');
  console.log('買主番号:', data.buyer_number);
  console.log('氏名:', data.name);
  console.log('削除日:', data.deleted_at);
  console.log('更新日:', data.updated_at);
}

restoreBuyer().catch(console.error);
