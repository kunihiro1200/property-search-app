import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTodayCallDirect() {
  const todayJST = new Date().toISOString().split('T')[0];
  console.log('今日の日付:', todayJST);
  
  // todayCallカテゴリのクエリをシミュレート
  console.log('\n=== todayCallカテゴリのクエリ ===');
  
  const { data, error, count } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method', { count: 'exact' })
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す')
    .or('phone_contact_person.is.null,phone_contact_person.eq.')
    .or('preferred_contact_time.is.null,preferred_contact_time.eq.')
    .or('contact_method.is.null,contact_method.eq.')
    .order('next_call_date', { ascending: true })
    .range(0, 999);
  
  console.log('件数:', count);
  console.log('エラー:', error);
  console.log('取得件数:', data?.length);
  
  // AA376が含まれているか確認
  const aa376 = data?.find(s => s.seller_number === 'AA376');
  console.log('\nAA376が含まれている:', aa376 ? 'はい' : 'いいえ');
  if (aa376) {
    console.log('AA376のデータ:', aa376);
  }
  
  // 最初の10件を表示
  console.log('\n最初の10件:');
  data?.slice(0, 10).forEach((s, i) => {
    console.log(`${i + 1}. ${s.seller_number} - 次電日: ${s.next_call_date}`);
  });
}

checkTodayCallDirect();
