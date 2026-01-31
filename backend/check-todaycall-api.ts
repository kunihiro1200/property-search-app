import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTodayCallQuery() {
  const todayJST = new Date().toISOString().split('T')[0];
  console.log('今日の日付:', todayJST);
  
  // 現在のクエリをシミュレート
  console.log('\n=== 現在のtodayCallクエリ ===');
  const { data: currentResult, error: currentError, count: currentCount } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method', { count: 'exact' })
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す')
    .or('phone_contact_person.is.null,phone_contact_person.eq.')
    .or('preferred_contact_time.is.null,preferred_contact_time.eq.')
    .or('contact_method.is.null,contact_method.eq.')
    .limit(10);
  
  console.log('件数:', currentCount);
  console.log('エラー:', currentError);
  console.log('最初の10件:', currentResult?.map(s => s.seller_number));
  
  // AA376が含まれているか確認
  console.log('\n=== AA376を直接検索 ===');
  const { data: aa376, error: aa376Error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method')
    .eq('seller_number', 'AA376')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す')
    .single();
  
  console.log('AA376が条件に一致:', aa376 ? 'はい' : 'いいえ');
  console.log('エラー:', aa376Error);
  
  // 正しいクエリ（コミュニケーション情報が全て空）
  console.log('\n=== 修正版クエリ（コミュニケーション情報なしの条件を修正） ===');
  const { data: fixedResult, error: fixedError, count: fixedCount } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method', { count: 'exact' })
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す')
    .is('phone_contact_person', null)
    .is('preferred_contact_time', null)
    .is('contact_method', null)
    .limit(10);
  
  console.log('件数:', fixedCount);
  console.log('エラー:', fixedError);
  console.log('最初の10件:', fixedResult?.map(s => s.seller_number));
  
  // 空文字列も含めた条件
  console.log('\n=== 修正版クエリ2（nullまたは空文字列） ===');
  const { data: fixed2Result, error: fixed2Error, count: fixed2Count } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method', { count: 'exact' })
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す')
    .or('phone_contact_person.is.null,phone_contact_person.eq.')
    .or('preferred_contact_time.is.null,preferred_contact_time.eq.')
    .or('contact_method.is.null,contact_method.eq.')
    .limit(50);
  
  console.log('件数:', fixed2Count);
  console.log('エラー:', fixed2Error);
  
  // AA376が含まれているか
  const hasAA376 = fixed2Result?.some(s => s.seller_number === 'AA376');
  console.log('AA376が含まれている:', hasAA376);
}

checkTodayCallQuery();
