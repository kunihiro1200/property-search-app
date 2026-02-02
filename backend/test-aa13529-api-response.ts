/**
 * AA13529のAPIレスポンスを確認するスクリプト
 * inquiryDateが正しく返されているか確認
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
  console.log('🔍 AA13529のAPIレスポンスを確認します...\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13529')
    .single();
  
  if (error || !data) {
    console.log('❌ AA13529が見つかりません:', error?.message);
    return;
  }

  const seller = data;
  
  console.log('📊 AA13529のDBデータ:');
  console.log('  seller_number:', seller.seller_number);
  console.log('  status:', seller.status);
  console.log('  inquiry_date:', seller.inquiry_date, `(type: ${typeof seller.inquiry_date})`);
  console.log('  inquiry_year:', seller.inquiry_year);
  console.log('  inquiry_detailed_datetime:', seller.inquiry_detailed_datetime);
  console.log('  next_call_date:', seller.next_call_date, `(type: ${typeof seller.next_call_date})`);
  console.log('  unreachable_status:', `"${seller.unreachable_status || ''}"`);
  console.log('  visit_assignee:', `"${seller.visit_assignee || ''}"`);
  console.log('  contact_method:', `"${seller.contact_method || ''}"`);
  console.log('  preferred_contact_time:', `"${seller.preferred_contact_time || ''}"`);
  console.log('  phone_contact_person:', `"${seller.phone_contact_person || ''}"`);

  console.log('\n📋 当日TEL_未着手の条件チェック（DBデータベース）:');
  
  const hasTrackingStatus = seller.status?.includes('追客中');
  const unreachableEmpty = !seller.unreachable_status || seller.unreachable_status === '';
  const visitAssigneeEmpty = !seller.visit_assignee || seller.visit_assignee === '';
  const contactMethodEmpty = !seller.contact_method || seller.contact_method === '';
  const preferredContactTimeEmpty = !seller.preferred_contact_time || seller.preferred_contact_time === '';
  const phoneContactPersonEmpty = !seller.phone_contact_person || seller.phone_contact_person === '';
  const allCommunicationEmpty = contactMethodEmpty && preferredContactTimeEmpty && phoneContactPersonEmpty;

  // inquiry_dateの正規化
  let normalizedInquiryDate: string | null = null;
  const inquiryDate = seller.inquiry_detailed_datetime || seller.inquiry_date;
  if (inquiryDate) {
    if (typeof inquiryDate === 'string') {
      normalizedInquiryDate = inquiryDate.split('T')[0];
    }
  }
  
  const inquiryDateAfterCutoff = normalizedInquiryDate ? normalizedInquiryDate >= '2026-01-01' : false;

  console.log('  1. 追客中を含む:', hasTrackingStatus ? '✅' : '❌', `(status="${seller.status}")`);
  console.log('  2. inquiry_date >= 2026-01-01:', inquiryDateAfterCutoff ? '✅' : '❌', `(normalizedInquiryDate="${normalizedInquiryDate}")`);
  console.log('  3. unreachable_status が空:', unreachableEmpty ? '✅' : '❌', `(unreachable_status="${seller.unreachable_status || ''}")`);
  console.log('  4. visit_assignee が空:', visitAssigneeEmpty ? '✅' : '❌', `(visit_assignee="${seller.visit_assignee || ''}")`);
  console.log('  5. コミュニケーション情報が全て空:', allCommunicationEmpty ? '✅' : '❌');

  const isTodayCallNotStarted = hasTrackingStatus && inquiryDateAfterCutoff && unreachableEmpty && visitAssigneeEmpty && allCommunicationEmpty;
  
  console.log('\n🎯 結果:');
  console.log('  当日TEL_未着手に該当:', isTodayCallNotStarted ? '✅ はい' : '❌ いいえ');
}

main().catch(console.error);
