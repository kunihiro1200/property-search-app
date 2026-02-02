/**
 * AA13529が当日TEL_未着手に分類されるか確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('🔍 AA13529の当日TEL_未着手条件を確認します...\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, status, inquiry_date, next_call_date, unreachable_status, visit_assignee, contact_method, preferred_contact_time, phone_contact_person')
    .eq('seller_number', 'AA13529')
    .single();

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('📊 AA13529のデータ:');
  console.log('  seller_number:', data.seller_number);
  console.log('  status:', data.status);
  console.log('  inquiry_date:', data.inquiry_date);
  console.log('  next_call_date:', data.next_call_date);
  console.log('  unreachable_status:', `"${data.unreachable_status || ''}"`);
  console.log('  visit_assignee:', `"${data.visit_assignee || ''}"`);
  console.log('  contact_method:', `"${data.contact_method || ''}"`);
  console.log('  preferred_contact_time:', `"${data.preferred_contact_time || ''}"`);
  console.log('  phone_contact_person:', `"${data.phone_contact_person || ''}"`);

  console.log('\n📋 当日TEL_未着手の条件チェック:');
  
  const hasTrackingStatus = data.status?.includes('追客中');
  const inquiryDateAfterCutoff = data.inquiry_date >= '2026-01-01';
  const unreachableEmpty = !data.unreachable_status || data.unreachable_status === '';
  const visitAssigneeEmpty = !data.visit_assignee || data.visit_assignee === '';
  const contactMethodEmpty = !data.contact_method || data.contact_method === '';
  const preferredContactTimeEmpty = !data.preferred_contact_time || data.preferred_contact_time === '';
  const phoneContactPersonEmpty = !data.phone_contact_person || data.phone_contact_person === '';
  const allCommunicationEmpty = contactMethodEmpty && preferredContactTimeEmpty && phoneContactPersonEmpty;

  console.log('  1. 追客中を含む:', hasTrackingStatus ? '✅' : '❌', `(status="${data.status}")`);
  console.log('  2. inquiry_date >= 2026-01-01:', inquiryDateAfterCutoff ? '✅' : '❌', `(inquiry_date="${data.inquiry_date}")`);
  console.log('  3. unreachable_status が空:', unreachableEmpty ? '✅' : '❌', `(unreachable_status="${data.unreachable_status || ''}")`);
  console.log('  4. visit_assignee が空:', visitAssigneeEmpty ? '✅' : '❌', `(visit_assignee="${data.visit_assignee || ''}")`);
  console.log('  5. コミュニケーション情報が全て空:', allCommunicationEmpty ? '✅' : '❌');
  console.log('     - contact_method:', contactMethodEmpty ? '✅' : '❌', `("${data.contact_method || ''}")`);
  console.log('     - preferred_contact_time:', preferredContactTimeEmpty ? '✅' : '❌', `("${data.preferred_contact_time || ''}")`);
  console.log('     - phone_contact_person:', phoneContactPersonEmpty ? '✅' : '❌', `("${data.phone_contact_person || ''}")`);

  const isTodayCallNotStarted = hasTrackingStatus && inquiryDateAfterCutoff && unreachableEmpty && visitAssigneeEmpty && allCommunicationEmpty;
  
  console.log('\n🎯 結果:');
  console.log('  当日TEL_未着手に該当:', isTodayCallNotStarted ? '✅ はい' : '❌ いいえ');
}

main().catch(console.error);
