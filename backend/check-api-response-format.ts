import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkApiResponseFormat() {
  const todayJST = new Date().toISOString().split('T')[0];
  
  // AA376のデータを取得
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA376')
    .single();
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('=== AA376のAPIレスポンス形式 ===');
  console.log('seller_number:', data.seller_number);
  console.log('status:', data.status);
  console.log('next_call_date:', data.next_call_date);
  console.log('visit_assignee:', data.visit_assignee);
  console.log('visit_date:', data.visit_date);
  console.log('contact_method:', data.contact_method);
  console.log('preferred_contact_time:', data.preferred_contact_time);
  console.log('phone_contact_person:', data.phone_contact_person);
  
  // フロントエンドのフィルタリング関数をシミュレート
  console.log('\n=== フロントエンドのフィルタリングシミュレート ===');
  
  // hasVisitAssignee
  const visitAssignee = data.visitAssignee || data.visit_assignee || '';
  const hasVisitAssignee = visitAssignee && visitAssignee.trim() !== '' && visitAssignee.trim() !== '外す';
  console.log('hasVisitAssignee:', hasVisitAssignee, '(visit_assignee:', data.visit_assignee, ')');
  
  // isTodayCallBase
  const status = data.status || '';
  const isFollowingUp = typeof status === 'string' && status.includes('追客中');
  console.log('isFollowingUp:', isFollowingUp, '(status:', status, ')');
  
  const nextCallDate = data.nextCallDate || data.next_call_date;
  const normalizedNextCallDate = nextCallDate ? nextCallDate.split('T')[0] : null;
  const isTodayOrBefore = normalizedNextCallDate && normalizedNextCallDate <= todayJST;
  console.log('isTodayOrBefore:', isTodayOrBefore, '(next_call_date:', nextCallDate, ', today:', todayJST, ')');
  
  // hasContactInfo
  const contactMethod = data.contactMethod || data.contact_method || '';
  const preferredContactTime = data.preferredContactTime || data.preferred_contact_time || '';
  const phoneContactPerson = data.phoneContactPerson || data.phone_contact_person || '';
  const hasContactInfo = (
    (contactMethod && contactMethod.trim() !== '') ||
    (preferredContactTime && preferredContactTime.trim() !== '') ||
    (phoneContactPerson && phoneContactPerson.trim() !== '')
  );
  console.log('hasContactInfo:', hasContactInfo);
  
  // isTodayCall
  const isTodayCall = !hasVisitAssignee && isFollowingUp && isTodayOrBefore && !hasContactInfo;
  console.log('\n=== 最終判定 ===');
  console.log('isTodayCall:', isTodayCall);
}

checkApiResponseFormat();
