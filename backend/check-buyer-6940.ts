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

async function checkBuyer() {
  console.log('=== 買主6940の存在確認 ===\n');
  
  // データベースで検索
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6940')
    .maybeSingle();
  
  if (error) {
    console.error('❌ データベースエラー:', error);
    return;
  }
  
  if (!data) {
    console.log('❌ データベースに買主6940が存在しません');
    console.log('\n=== 同期が必要です ===');
    console.log('スプレッドシートから同期してください。');
    return;
  }
  
  console.log('✅ データベースに買主6940が存在します\n');
  console.log('=== 買主6940のデータ ===');
  console.log('買主番号:', data.buyer_number);
  console.log('氏名:', data.name);
  console.log('電話番号:', data.phone);
  console.log('メールアドレス:', data.email);
  console.log('受付日:', data.reception_date);
  console.log('問合せ元:', data.inquiry_source);
  console.log('削除日:', data.deleted_at);
  console.log('作成日:', data.created_at);
  console.log('更新日:', data.updated_at);
}

checkBuyer().catch(console.error);
