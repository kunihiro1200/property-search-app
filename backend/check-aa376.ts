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
  
  console.log('=== AA376 データ ===');
  console.log('seller_number:', data.seller_number);
  console.log('name:', data.name);
  console.log('status (状況当社):', data.status);
  console.log('next_call_date (次電日):', data.next_call_date);
  console.log('visit_assignee (営担):', data.visit_assignee);
  console.log('visit_date (訪問日):', data.visit_date);
  console.log('contact_method (連絡方法):', data.contact_method);
  console.log('preferred_contact_time (連絡取りやすい時間):', data.preferred_contact_time);
  console.log('phone_contact_person (電話担当):', data.phone_contact_person);
  console.log('mailing_status (郵送ステータス):', data.mailing_status);
  
  // 当日TEL分の条件をチェック
  console.log('');
  console.log('=== 当日TEL分の条件チェック ===');
  
  // 1. 状況（当社）に「追客中」が含まれる
  const isFollowingUp = data.status && data.status.includes('追客中');
  console.log('1. 追客中:', isFollowingUp, '(status=' + data.status + ')');
  
  // 2. 次電日が今日以前
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextCallDate = data.next_call_date ? new Date(data.next_call_date) : null;
  if (nextCallDate) nextCallDate.setHours(0, 0, 0, 0);
  const isNextCallTodayOrBefore = nextCallDate && nextCallDate <= today;
  console.log('2. 次電日が今日以前:', isNextCallTodayOrBefore, '(next_call_date=' + data.next_call_date + ', today=' + today.toISOString().split('T')[0] + ')');
  
  // 3. 営担が空
  const hasNoAssignee = !data.visit_assignee || data.visit_assignee.trim() === '' || data.visit_assignee.trim() === '外す';
  console.log('3. 営担が空:', hasNoAssignee, '(visit_assignee=' + data.visit_assignee + ')');
  
  // 4. コミュニケーション情報が全て空
  const hasNoContactInfo = !data.contact_method && !data.preferred_contact_time && !data.phone_contact_person;
  console.log('4. コミュニケーション情報が全て空:', hasNoContactInfo);
  console.log('   - contact_method:', data.contact_method);
  console.log('   - preferred_contact_time:', data.preferred_contact_time);
  console.log('   - phone_contact_person:', data.phone_contact_person);
  
  // 結論
  const shouldBeTodayCall = isFollowingUp && isNextCallTodayOrBefore && hasNoAssignee && hasNoContactInfo;
  console.log('');
  console.log('=== 結論 ===');
  console.log('当日TEL分に該当するか:', shouldBeTodayCall);
  
  if (!shouldBeTodayCall) {
    console.log('');
    console.log('=== 該当しない理由 ===');
    if (!isFollowingUp) console.log('- 状況（当社）に「追客中」が含まれていない');
    if (!isNextCallTodayOrBefore) console.log('- 次電日が今日以前ではない');
    if (!hasNoAssignee) console.log('- 営担に値がある');
    if (!hasNoContactInfo) console.log('- コミュニケーション情報のいずれかに値がある');
  }
}

checkSeller();
