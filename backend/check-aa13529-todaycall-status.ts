/**
 * AA13529が「当日TEL_未着手」に該当するか確認するスクリプト
 * 
 * 条件:
 * - 反響日付が2026年1月1日以降
 * - 不通フィールド（unreachable_status）が空欄
 * - 状況（当社）に「追客中」が含まれる
 * - 次電日が今日以前
 * - コミュニケーション情報が全て空
 * - 営担なし
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('=== AA13529の「当日TEL_未着手」該当チェック ===\n');
  
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, unreachable_status, status, next_call_date, phone_contact_person, preferred_contact_time, contact_method, visit_assignee')
    .eq('seller_number', 'AA13529')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('AA13529のデータ:');
  console.log('  inquiry_date:', data.inquiry_date);
  console.log('  unreachable_status:', data.unreachable_status);
  console.log('  status:', data.status);
  console.log('  next_call_date:', data.next_call_date);
  console.log('  phone_contact_person:', data.phone_contact_person);
  console.log('  preferred_contact_time:', data.preferred_contact_time);
  console.log('  contact_method:', data.contact_method);
  console.log('  visit_assignee:', data.visit_assignee);
  
  console.log('\n=== 条件チェック ===');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 条件1: 反響日付が2026年1月1日以降
  const inquiryDate = data.inquiry_date ? new Date(data.inquiry_date) : null;
  const is2026OrLater = inquiryDate && inquiryDate >= new Date('2026-01-01');
  console.log(`1. 反響日付が2026/1/1以降: ${is2026OrLater ? '✅' : '❌'} (${data.inquiry_date})`);
  
  // 条件2: 不通フィールドが空欄
  const isUnreachableEmpty = !data.unreachable_status || data.unreachable_status === '';
  console.log(`2. 不通フィールドが空欄: ${isUnreachableEmpty ? '✅' : '❌'} (${data.unreachable_status || '空欄'})`);
  
  // 条件3: 状況（当社）に「追客中」が含まれる
  const hasFollowUp = data.status && data.status.includes('追客中');
  console.log(`3. 状況に「追客中」が含まれる: ${hasFollowUp ? '✅' : '❌'} (${data.status})`);
  
  // 条件4: 次電日が今日以前
  const nextCallDate = data.next_call_date ? new Date(data.next_call_date) : null;
  const isNextCallTodayOrBefore = nextCallDate && nextCallDate <= today;
  console.log(`4. 次電日が今日以前: ${isNextCallTodayOrBefore ? '✅' : '❌'} (${data.next_call_date})`);
  
  // 条件5: コミュニケーション情報が全て空
  const hasNoContactInfo = !data.phone_contact_person && !data.preferred_contact_time && !data.contact_method;
  console.log(`5. コミュニケーション情報が全て空: ${hasNoContactInfo ? '✅' : '❌'}`);
  
  // 条件6: 営担なし
  const hasNoAssignee = !data.visit_assignee || data.visit_assignee === '';
  console.log(`6. 営担なし: ${hasNoAssignee ? '✅' : '❌'} (${data.visit_assignee || '空欄'})`);
  
  // 総合判定
  const isTodayCallNotStarted = is2026OrLater && isUnreachableEmpty && hasFollowUp && isNextCallTodayOrBefore && hasNoContactInfo && hasNoAssignee;
  console.log(`\n=== 総合判定 ===`);
  console.log(`「当日TEL_未着手」に該当: ${isTodayCallNotStarted ? '✅ YES' : '❌ NO'}`);
}

check().catch(console.error);
