/**
 * AA376がサイドバーカウントに含まれるかテスト
 * 
 * AA376の条件:
 * - status: "追客中" ✅
 * - next_call_date: "2026-01-31" (今日) ✅
 * - visit_assignee: null ✅
 * - コミュニケーション情報: 全てnull ✅
 * 
 * 期待結果: 「当日TEL分」に含まれる
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://krxhrbtlgfjzsseegaqq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAA376SidebarCounts() {
  console.log('=== AA376 サイドバーカウントテスト ===');
  console.log('現在時刻:', new Date().toISOString());
  
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  console.log('今日の日付 (JST):', todayJST);
  
  // 1. AA376のデータを確認
  console.log('\n--- AA376のデータ確認 ---');
  const { data: aa376, error: aa376Error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA376')
    .single();
  
  if (aa376Error) {
    console.error('❌ AA376取得エラー:', aa376Error);
    return;
  }
  
  console.log('AA376データ:');
  console.log('  - seller_number:', aa376.seller_number);
  console.log('  - status:', aa376.status);
  console.log('  - next_call_date:', aa376.next_call_date);
  console.log('  - visit_assignee:', aa376.visit_assignee);
  console.log('  - phone_contact_person:', aa376.phone_contact_person);
  console.log('  - preferred_contact_time:', aa376.preferred_contact_time);
  console.log('  - contact_method:', aa376.contact_method);
  console.log('  - deleted_at:', aa376.deleted_at);
  
  // 2. 「当日TEL分」の条件を確認
  console.log('\n--- 「当日TEL分」条件チェック ---');
  const isFollowingUp = aa376.status && aa376.status.includes('追客中');
  const isNextCallTodayOrBefore = aa376.next_call_date && aa376.next_call_date <= todayJST;
  const hasNoVisitAssignee = !aa376.visit_assignee || aa376.visit_assignee.trim() === '' || aa376.visit_assignee.trim() === '外す';
  const hasNoContactInfo = 
    (!aa376.phone_contact_person || aa376.phone_contact_person.trim() === '') &&
    (!aa376.preferred_contact_time || aa376.preferred_contact_time.trim() === '') &&
    (!aa376.contact_method || aa376.contact_method.trim() === '');
  
  console.log('  - 追客中:', isFollowingUp ? '✅' : '❌');
  console.log('  - 次電日が今日以前:', isNextCallTodayOrBefore ? '✅' : '❌');
  console.log('  - 営担なし:', hasNoVisitAssignee ? '✅' : '❌');
  console.log('  - コミュニケーション情報なし:', hasNoContactInfo ? '✅' : '❌');
  
  const shouldBeInTodayCall = isFollowingUp && isNextCallTodayOrBefore && hasNoVisitAssignee && hasNoContactInfo;
  console.log('\n  → 「当日TEL分」に含まれるべき:', shouldBeInTodayCall ? '✅ YES' : '❌ NO');
  
  // 3. 「当日TEL分」のクエリを実行
  console.log('\n--- 「当日TEL分」クエリ実行 ---');
  const { data: todayCallSellers, error: todayCallError } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, phone_contact_person, preferred_contact_time, contact_method')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST);
  
  if (todayCallError) {
    console.error('❌ クエリエラー:', todayCallError);
    return;
  }
  
  console.log('クエリ結果件数:', todayCallSellers?.length);
  
  // AA376がクエリ結果に含まれているか確認
  const aa376InQuery = todayCallSellers?.find(s => s.seller_number === 'AA376');
  console.log('AA376がクエリ結果に含まれている:', aa376InQuery ? '✅ YES' : '❌ NO');
  
  // 4. フィルタリング後の結果を確認
  console.log('\n--- フィルタリング後の結果 ---');
  const filteredTodayCallSellers = (todayCallSellers || []).filter(s => {
    // 営担に入力がある場合は当日TEL分から除外
    const hasVisitAssignee = s.visit_assignee && s.visit_assignee.trim() !== '' && s.visit_assignee.trim() !== '外す';
    return !hasVisitAssignee;
  });
  
  console.log('営担なしでフィルタリング後の件数:', filteredTodayCallSellers.length);
  
  // コミュニケーション情報がないものをカウント（当日TEL分）
  const todayCallNoInfo = filteredTodayCallSellers.filter(s => {
    const hasInfo = (s.phone_contact_person && s.phone_contact_person.trim() !== '') ||
                    (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
                    (s.contact_method && s.contact_method.trim() !== '');
    return !hasInfo;
  });
  
  console.log('「当日TEL分」の件数:', todayCallNoInfo.length);
  
  // AA376がフィルタリング後の結果に含まれているか確認
  const aa376InFiltered = todayCallNoInfo.find(s => s.seller_number === 'AA376');
  console.log('AA376が「当日TEL分」に含まれている:', aa376InFiltered ? '✅ YES' : '❌ NO');
  
  // 5. 「当日TEL分」の売主リストを表示（最初の10件）
  console.log('\n--- 「当日TEL分」の売主リスト（最初の10件） ---');
  todayCallNoInfo.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.seller_number} (次電日: ${s.next_call_date})`);
  });
  
  console.log('\n=== テスト完了 ===');
}

testAA376SidebarCounts().catch(console.error);
