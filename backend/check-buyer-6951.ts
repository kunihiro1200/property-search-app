import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';
import { calculateBuyerStatus, calculateBuyerStatusComplete } from './src/services/BuyerStatusCalculator';

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer() {
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6951')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== 買主6951のデータ ===');
  console.log('受付日:', data.reception_date);
  console.log('次電日:', data.next_call_date);
  console.log('後続担当:', data.follow_up_assignee);
  console.log('内覧日:', data.latest_viewing_date);
  console.log('最新状況:', data.latest_status);
  console.log('削除日:', data.deleted_at);
  console.log('');
  
  // ステータスを計算
  let statusResult = calculateBuyerStatus(data);
  
  if (!statusResult.status || statusResult.priority === 0) {
    statusResult = calculateBuyerStatusComplete(data);
  }
  
  console.log('=== ステータス計算結果 ===');
  console.log('ステータス:', statusResult.status);
  console.log('優先順位:', statusResult.priority);
  console.log('マッチした条件:', statusResult.matchedCondition);
  console.log('');
  
  // 「当日TEL」の条件を詳細チェック
  console.log('=== 「当日TEL」の条件チェック ===');
  
  // 次電日の日付計算
  const nextCallDate = data.next_call_date ? new Date(data.next_call_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (nextCallDate) {
    nextCallDate.setHours(0, 0, 0, 0);
    const isPastOrToday = nextCallDate <= today;
    console.log('次電日:', data.next_call_date);
    console.log('今日:', today.toISOString().split('T')[0]);
    console.log('次電日 <= 今日:', isPastOrToday ? '✓' : '✗');
  } else {
    console.log('次電日: なし → ✗');
  }
  
  console.log(`後続担当が入力されている: ${data.follow_up_assignee ? '✓' : '✗'}`);
  console.log(`後続担当: ${data.follow_up_assignee || '(空欄)'}`);
  console.log(`次電日が入力されている: ${data.next_call_date ? '✓' : '✗'}`);
}

checkBuyer().catch(console.error);
