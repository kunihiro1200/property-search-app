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
    .eq('buyer_number', '6940')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== 買主6940のデータ ===');
  console.log('受付日:', data.reception_date);
  console.log('内覧日:', data.latest_viewing_date);
  console.log('後続担当:', data.follow_up_assignee);
  console.log('最新状況:', data.latest_status);
  console.log('内覧促進メール不要:', data.viewing_promotion_not_needed);
  console.log('内覧促進メール送信者:', data.viewing_promotion_sender);
  console.log('業者問合せ:', data.broker_inquiry);
  console.log('問合せ元:', data.inquiry_source);
  console.log('問合時確度:', data.inquiry_confidence);
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
  
  // 「要内覧促進客」の条件を詳細チェック
  console.log('=== 「要内覧促進客」の条件チェック ===');
  
  // 受付日の日数計算
  const receptionDate = data.reception_date ? new Date(data.reception_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (receptionDate) {
    const daysDiff = Math.floor((today.getTime() - receptionDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`受付日からの経過日数: ${daysDiff}日`);
    console.log(`条件: 14日前 <= 受付日 <= 4日前 → ${daysDiff >= 4 && daysDiff <= 14 ? '✓' : '✗'}`);
  } else {
    console.log('受付日: なし → ✗');
  }
  
  console.log(`内覧日が空欄: ${!data.latest_viewing_date ? '✓' : '✗'}`);
  console.log(`後続担当が空欄: ${!data.follow_up_assignee ? '✓' : '✗'}`);
  console.log(`最新状況が空欄: ${!data.latest_status ? '✓' : '✗'}`);
  console.log(`内覧促進メール不要 ≠ "不要": ${data.viewing_promotion_not_needed !== '不要' ? '✓' : '✗'}`);
  console.log(`内覧促進メール送信者が空欄: ${!data.viewing_promotion_sender ? '✓' : '✗'}`);
  console.log(`業者問合せが空欄: ${!data.broker_inquiry ? '✓' : '✗'}`);
  console.log(`問合せ元 ≠ "配信希望アンケート": ${data.inquiry_source !== '配信希望アンケート' ? '✓' : '✗'}`);
  console.log(`問合せ元に"ピンリッチ"を含まない: ${!data.inquiry_source?.includes('ピンリッチ') ? '✓' : '✗'}`);
  console.log(`問合せ元に"2件目以降紹介"を含まない: ${!data.inquiry_source?.includes('2件目以降紹介') ? '✓' : '✗'}`);
  console.log(`問合時確度 ≠ "e（買付物件の問合せ）": ${data.inquiry_confidence !== 'e（買付物件の問合せ）' ? '✓' : '✗'}`);
  console.log(`問合時確度 ≠ "d（資料送付不要、条件不適合など）": ${data.inquiry_confidence !== 'd（資料送付不要、条件不適合など）' ? '✓' : '✗'}`);
  console.log(`問合時確度 ≠ "b（内覧検討）": ${data.inquiry_confidence !== 'b（内覧検討）' ? '✓' : '✗'}`);
}

checkBuyer().catch(console.error);
