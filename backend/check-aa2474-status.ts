import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 環境変数を確認
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('環境変数が設定されていません');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAA2474() {
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, phone_assignee, is_unreachable, pinrich_status, visit_date')
    .eq('seller_number', 'AA2474')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('AA2474 データ:');
  console.log(JSON.stringify(data, null, 2));
  
  // 今日の日付
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('\n今日の日付:', today.toISOString().split('T')[0]);
  
  // next_call_dateの日付
  if (data.next_call_date) {
    const nextCallDate = new Date(data.next_call_date);
    nextCallDate.setHours(0, 0, 0, 0);
    console.log('next_call_date:', nextCallDate.toISOString().split('T')[0]);
    console.log('今日と一致:', today.getTime() === nextCallDate.getTime());
  }
  
  // 条件チェック
  console.log('\n条件チェック:');
  console.log('1. next_call_dateが今日:', data.next_call_date ? 'あり' : 'なし');
  console.log('2. statusに「追客中」を含む:', data.status?.includes('追客中') ? 'はい' : 'いいえ');
  console.log('3. is_unreachableがfalse:', data.is_unreachable === false ? 'はい' : 'いいえ');
  console.log('4. phone_assigneeが空:', !data.phone_assignee || data.phone_assignee === '' ? 'はい' : 'いいえ');
  
  // 「当日TEL（未着手）」の条件
  console.log('\n「当日TEL（未着手）」の条件:');
  const isCallTodayUnstarted = 
    data.next_call_date &&
    data.status?.includes('追客中') &&
    data.is_unreachable === false &&
    (!data.phone_assignee || data.phone_assignee === '');
  
  console.log('結果:', isCallTodayUnstarted ? '✅ 条件を満たす' : '❌ 条件を満たさない');
}

checkAA2474();
