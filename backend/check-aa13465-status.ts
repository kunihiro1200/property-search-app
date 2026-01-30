import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, visit_date, phone_contact_person, preferred_contact_time, contact_method')
    .eq('seller_number', 'AA13465')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('=== AA13465 データ ===');
  console.log('seller_number:', data.seller_number);
  console.log('status:', data.status);
  console.log('next_call_date:', data.next_call_date);
  console.log('visit_assignee:', data.visit_assignee);
  console.log('visit_date:', data.visit_date);
  console.log('phone_contact_person:', data.phone_contact_person);
  console.log('preferred_contact_time:', data.preferred_contact_time);
  console.log('contact_method:', data.contact_method);
  console.log('');
  console.log('今日（JST）:', todayJST);
  console.log('');
  
  // 条件チェック
  const isFollowingUp = data.status && data.status.includes('追客中');
  const hasVisitAssignee = data.visit_assignee && data.visit_assignee.trim() !== '';
  const visitDateBeforeToday = data.visit_date && data.visit_date < todayJST;
  const nextCallDateTodayOrBefore = data.next_call_date && data.next_call_date <= todayJST;
  
  console.log('=== 条件チェック ===');
  console.log('追客中:', isFollowingUp);
  console.log('営担あり:', hasVisitAssignee, `(${data.visit_assignee})`);
  console.log('訪問日が今日より前:', visitDateBeforeToday, `(${data.visit_date} < ${todayJST})`);
  console.log('次電日が今日以前:', nextCallDateTodayOrBefore, `(${data.next_call_date} <= ${todayJST})`);
  console.log('');
  
  // ステータス判定
  console.log('=== ステータス判定 ===');
  if (hasVisitAssignee && visitDateBeforeToday) {
    console.log('→ 訪問済み（' + data.visit_assignee + '）に属するべき');
  } else if (hasVisitAssignee && data.visit_date >= todayJST) {
    console.log('→ 訪問予定（' + data.visit_assignee + '）に属するべき');
  } else if (isFollowingUp && nextCallDateTodayOrBefore) {
    console.log('→ 当日TEL分に属するべき');
  } else {
    console.log('→ 特定のステータスに属さない');
  }
}

check();
