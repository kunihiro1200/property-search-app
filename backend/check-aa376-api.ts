import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSeller() {
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA376')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('=== AA376 APIレスポンス形式 ===');
  console.log('sellerNumber:', data.seller_number);
  console.log('status:', data.status);
  console.log('nextCallDate:', data.next_call_date);
  console.log('visitAssignee:', data.visit_assignee);
  console.log('contactMethod:', data.contact_method);
  console.log('preferredContactTime:', data.preferred_contact_time);
  console.log('phoneContactPerson:', data.phone_contact_person);
  
  // フロントエンドのフィルタリングロジックをシミュレート
  console.log('');
  console.log('=== フロントエンドのフィルタリングロジック ===');
  
  // isTodayCallBase
  const status = data.status || '';
  const isFollowingUp = typeof status === 'string' && status.includes('追客中');
  console.log('isFollowingUp:', isFollowingUp);
  
  // 次電日が今日以前かチェック（フロントエンドのロジック）
  const nextCallDate = data.next_call_date;
  
  // normalizeDateString
  let normalizedNextCallDate = null;
  if (nextCallDate) {
    if (nextCallDate.includes('-')) {
      const datePart = nextCallDate.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        normalizedNextCallDate = parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
      }
    }
  }
  console.log('normalizedNextCallDate:', normalizedNextCallDate);
  
  // getTodayJSTString
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  console.log('todayStr:', todayStr);
  
  // isTodayOrBefore
  const isNextCallTodayOrBefore = normalizedNextCallDate && normalizedNextCallDate <= todayStr;
  console.log('isNextCallTodayOrBefore:', isNextCallTodayOrBefore);
  
  // hasVisitAssignee
  const visitAssignee = data.visit_assignee || '';
  const hasAssignee = visitAssignee && visitAssignee.trim() !== '' && visitAssignee.trim() !== '外す';
  console.log('hasVisitAssignee:', hasAssignee);
  
  // hasContactInfo
  const contactMethod = data.contact_method || '';
  const preferredContactTime = data.preferred_contact_time || '';
  const phoneContactPerson = data.phone_contact_person || '';
  const hasContactInfo = 
    (contactMethod && contactMethod.trim() !== '') ||
    (preferredContactTime && preferredContactTime.trim() !== '') ||
    (phoneContactPerson && phoneContactPerson.trim() !== '');
  console.log('hasContactInfo:', hasContactInfo);
  
  // isTodayCall
  const isTodayCall = !hasAssignee && isFollowingUp && isNextCallTodayOrBefore && !hasContactInfo;
  console.log('');
  console.log('=== 結論 ===');
  console.log('isTodayCall:', isTodayCall);
}

checkSeller();
