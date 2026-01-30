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
    .select('seller_number, status, next_call_date, phone_contact_person, preferred_contact_time, contact_method, deleted_at')
    .eq('seller_number', 'AA130')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('=== AA130 データ ===');
  console.log('seller_number:', data.seller_number);
  console.log('status:', data.status);
  console.log('next_call_date:', data.next_call_date);
  console.log('phone_contact_person:', data.phone_contact_person);
  console.log('preferred_contact_time:', data.preferred_contact_time);
  console.log('contact_method:', data.contact_method);
  console.log('deleted_at:', data.deleted_at);
  
  // 条件チェック
  const isFollowingUp = data.status && data.status.includes('追客中');
  console.log('');
  console.log('=== 条件チェック ===');
  console.log('追客中:', isFollowingUp);
  console.log('コミュニケーション情報あり:', !!(data.phone_contact_person || data.preferred_contact_time || data.contact_method));
  console.log('deleted_at is null:', data.deleted_at === null);
  
  // 今日の日付（JST）
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  console.log('');
  console.log('=== 日付比較 ===');
  console.log('今日（JST）:', todayJST);
  console.log('次電日:', data.next_call_date);
  console.log('次電日 <= 今日:', data.next_call_date <= todayJST);
}

check();
