import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function test() {
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('今日（JST）:', todayJST);
  console.log('');

  // 当日TEL（内容）の条件に合う売主を取得
  const { data: todayCallBaseSellers, error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, phone_contact_person, preferred_contact_time, contact_method')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('=== 追客中 AND 次電日が今日以前の売主 ===');
  console.log('件数:', todayCallBaseSellers?.length);
  console.log('');

  // コミュニケーション情報があるものをフィルタ
  const withInfo = (todayCallBaseSellers || []).filter(s => {
    const hasInfo = (s.phone_contact_person && s.phone_contact_person.trim() !== '') ||
                    (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
                    (s.contact_method && s.contact_method.trim() !== '');
    return hasInfo;
  });

  // コミュニケーション情報がないものをフィルタ
  const withoutInfo = (todayCallBaseSellers || []).filter(s => {
    const hasInfo = (s.phone_contact_person && s.phone_contact_person.trim() !== '') ||
                    (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
                    (s.contact_method && s.contact_method.trim() !== '');
    return !hasInfo;
  });

  console.log('=== 当日TEL分（コミュニケーション情報なし）===');
  console.log('件数:', withoutInfo.length);
  console.log('');

  console.log('=== 当日TEL（内容）（コミュニケーション情報あり）===');
  console.log('件数:', withInfo.length);
  console.log('');

  // AA130を探す
  const aa130 = todayCallBaseSellers?.find(s => s.seller_number === 'AA130');
  if (aa130) {
    console.log('=== AA130 ===');
    console.log('seller_number:', aa130.seller_number);
    console.log('status:', aa130.status);
    console.log('next_call_date:', aa130.next_call_date);
    console.log('phone_contact_person:', aa130.phone_contact_person);
    console.log('preferred_contact_time:', aa130.preferred_contact_time);
    console.log('contact_method:', aa130.contact_method);
    
    const hasInfo = (aa130.phone_contact_person && aa130.phone_contact_person.trim() !== '') ||
                    (aa130.preferred_contact_time && aa130.preferred_contact_time.trim() !== '') ||
                    (aa130.contact_method && aa130.contact_method.trim() !== '');
    console.log('コミュニケーション情報あり:', hasInfo);
    console.log('→ 当日TEL（内容）に含まれる:', hasInfo);
  } else {
    console.log('❌ AA130が条件に合う売主リストに見つかりません');
  }

  // 当日TEL（内容）の売主リストを表示
  console.log('');
  console.log('=== 当日TEL（内容）の売主リスト（最初の10件）===');
  withInfo.slice(0, 10).forEach(s => {
    const info = s.phone_contact_person || s.preferred_contact_time || s.contact_method;
    console.log(`  ${s.seller_number}: ${info}`);
  });
}

test();
