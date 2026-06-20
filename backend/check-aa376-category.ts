import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA376() {
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, visit_date, contact_method, preferred_contact_time, phone_contact_person')
    .eq('seller_number', 'AA376')
    .single();
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('=== AA376のデータ ===');
  console.log('売主番号:', data.seller_number);
  console.log('状況（当社）:', data.status);
  console.log('次電日:', data.next_call_date);
  console.log('営担:', data.visit_assignee);
  console.log('訪問日:', data.visit_date);
  console.log('連絡方法:', data.contact_method);
  console.log('連絡取りやすい時間:', data.preferred_contact_time);
  console.log('電話担当:', data.phone_contact_person);
  
  // 判定
  const hasVisitAssignee = data.visit_assignee && data.visit_assignee !== '' && data.visit_assignee !== '外す';
  const hasContactInfo = data.contact_method || data.preferred_contact_time || data.phone_contact_person;
  const isChasing = data.status && data.status.includes('追客中');
  const today = new Date().toISOString().split('T')[0];
  const nextCallDate = data.next_call_date ? data.next_call_date.split('T')[0] : null;
  const isTodayOrBefore = nextCallDate && nextCallDate <= today;
  
  console.log('');
  console.log('=== 判定結果 ===');
  console.log('営担あり:', hasVisitAssignee);
  console.log('コミュニケーション情報あり:', hasContactInfo);
  console.log('追客中:', isChasing);
  console.log('次電日が今日以前:', isTodayOrBefore, '(次電日:', nextCallDate, ', 今日:', today, ')');
  
  if (hasVisitAssignee && isTodayOrBefore) {
    console.log('→ 当日TEL（担当）に該当');
  } else if (isChasing && isTodayOrBefore && !hasContactInfo && !hasVisitAssignee) {
    console.log('→ 当日TEL分に該当');
  } else if (isChasing && isTodayOrBefore && hasContactInfo && !hasVisitAssignee) {
    console.log('→ 当日TEL（内容）に該当');
  } else {
    console.log('→ どのカテゴリにも該当しない');
  }
}

checkAA376();
