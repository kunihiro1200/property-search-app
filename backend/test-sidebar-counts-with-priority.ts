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

  // 1. 訪問予定（営担あり + 訪問日が今日以降）
  const { count: visitScheduledCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .gte('visit_date', todayJST);

  console.log('=== 訪問予定 ===');
  console.log('件数:', visitScheduledCount);

  // 2. 訪問済み（営担あり + 訪問日が昨日以前）
  const { count: visitCompletedCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .lt('visit_date', todayJST);

  console.log('=== 訪問済み ===');
  console.log('件数:', visitCompletedCount);

  // 3. 当日TEL分/当日TEL（内容）の基本条件に合う売主を取得
  const { data: todayCallBaseSellers } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, visit_date, phone_contact_person, preferred_contact_time, contact_method')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST);

  console.log('');
  console.log('=== 当日TEL基本条件（追客中 AND 次電日が今日以前）===');
  console.log('件数:', todayCallBaseSellers?.length);

  // 訪問予定/訪問済みの売主を除外
  const filteredTodayCallSellers = (todayCallBaseSellers || []).filter(s => {
    const hasVisitAssignee = s.visit_assignee && s.visit_assignee.trim() !== '';
    const hasVisitDate = s.visit_date && s.visit_date.trim() !== '';
    if (hasVisitAssignee && hasVisitDate) {
      return false; // 訪問予定/訪問済みなので当日TELから除外
    }
    return true;
  });

  // 除外された売主を表示
  const excludedSellers = (todayCallBaseSellers || []).filter(s => {
    const hasVisitAssignee = s.visit_assignee && s.visit_assignee.trim() !== '';
    const hasVisitDate = s.visit_date && s.visit_date.trim() !== '';
    return hasVisitAssignee && hasVisitDate;
  });

  console.log('');
  console.log('=== 訪問予定/訪問済みとして除外された売主 ===');
  console.log('件数:', excludedSellers.length);
  excludedSellers.forEach(s => {
    const visitStatus = s.visit_date >= todayJST ? '訪問予定' : '訪問済み';
    console.log(`  ${s.seller_number}: ${visitStatus}(${s.visit_assignee}) - 訪問日: ${s.visit_date}`);
  });

  // AA13465を確認
  const aa13465 = excludedSellers.find(s => s.seller_number === 'AA13465');
  if (aa13465) {
    console.log('');
    console.log('✅ AA13465は訪問済みとして当日TELから除外されています');
  } else {
    const aa13465InBase = todayCallBaseSellers?.find(s => s.seller_number === 'AA13465');
    if (aa13465InBase) {
      console.log('');
      console.log('❌ AA13465は当日TEL基本条件に含まれていますが、除外されていません');
    } else {
      console.log('');
      console.log('ℹ️ AA13465は当日TEL基本条件に含まれていません');
    }
  }

  // コミュニケーション情報があるものをカウント（当日TEL（内容））
  const todayCallWithInfoCount = filteredTodayCallSellers.filter(s => {
    const hasInfo = (s.phone_contact_person && s.phone_contact_person.trim() !== '') ||
                    (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
                    (s.contact_method && s.contact_method.trim() !== '');
    return hasInfo;
  }).length;

  // コミュニケーション情報がないものをカウント（当日TEL分）
  const todayCallNoInfoCount = filteredTodayCallSellers.filter(s => {
    const hasInfo = (s.phone_contact_person && s.phone_contact_person.trim() !== '') ||
                    (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
                    (s.contact_method && s.contact_method.trim() !== '');
    return !hasInfo;
  }).length;

  console.log('');
  console.log('=== 最終カウント（訪問予定/訪問済み除外後）===');
  console.log('当日TEL分:', todayCallNoInfoCount);
  console.log('当日TEL（内容）:', todayCallWithInfoCount);
  console.log('訪問予定:', visitScheduledCount);
  console.log('訪問済み:', visitCompletedCount);
}

test();
