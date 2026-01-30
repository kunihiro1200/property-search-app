import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  // APIと同じクエリを実行
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .is('deleted_at', null)
    .eq('seller_number', 'AA130')
    .single();
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('=== AA130 APIレスポンス相当 ===');
  console.log('sellerNumber:', data.seller_number);
  console.log('status:', data.status);
  console.log('nextCallDate:', data.next_call_date);
  console.log('phoneContactPerson:', data.phone_contact_person);
  console.log('preferredContactTime:', data.preferred_contact_time);
  console.log('contactMethod:', data.contact_method);
  
  // フロントエンドのフィルター条件をシミュレート
  console.log('');
  console.log('=== フロントエンドフィルター条件 ===');
  
  // isTodayCallWithInfo の条件
  const status = data.status || '';
  const isFollowingUp = status.includes('追客中');
  console.log('1. 追客中:', isFollowingUp);
  
  const nextCallDate = data.next_call_date;
  // JST今日
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  const isTodayOrBefore = nextCallDate && nextCallDate <= todayJST;
  console.log('2. 次電日が今日以前:', isTodayOrBefore, `(${nextCallDate} <= ${todayJST})`);
  
  const hasContactInfo = !!(data.phone_contact_person || data.preferred_contact_time || data.contact_method);
  console.log('3. コミュニケーション情報あり:', hasContactInfo);
  
  const shouldBeInTodayCallWithInfo = isFollowingUp && isTodayOrBefore && hasContactInfo;
  console.log('');
  console.log('=== 結果 ===');
  console.log('当日TEL（内容）に表示されるべき:', shouldBeInTodayCallWithInfo);
}

check();
