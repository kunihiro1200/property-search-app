/**
 * サイドバーAPIの直接テスト
 * バックエンドのlistSellersメソッドを直接呼び出してテスト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSidebarAPI() {
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('=== サイドバーAPI直接テスト ===');
  console.log('今日の日付 (JST):', todayJST);
  
  // visitScheduledのクエリをテスト
  console.log('\n--- visitScheduled クエリテスト ---');
  const { data: visitScheduled, error: err1, count: count1 } = await supabase
    .from('sellers')
    .select('id, seller_number, visit_assignee, visit_date, name', { count: 'exact' })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .range(0, 499);
  
  if (err1) {
    console.error('Error:', err1);
  } else {
    console.log('件数:', count1);
    console.log('取得件数:', visitScheduled?.length || 0);
    visitScheduled?.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.seller_number} - 営担: ${s.visit_assignee}, 訪問日: ${s.visit_date}`);
    });
  }
  
  // visitCompletedのクエリをテスト
  console.log('\n--- visitCompleted クエリテスト ---');
  const { data: visitCompleted, error: err2, count: count2 } = await supabase
    .from('sellers')
    .select('id, seller_number, visit_assignee, visit_date, name', { count: 'exact' })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .range(0, 499);
  
  if (err2) {
    console.error('Error:', err2);
  } else {
    console.log('件数:', count2);
    console.log('取得件数:', visitCompleted?.length || 0);
    visitCompleted?.slice(0, 10).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.seller_number} - 営担: ${s.visit_assignee}, 訪問日: ${s.visit_date}`);
    });
  }
  
  // decryptSellerの動作を確認（visitDateが正しく返されるか）
  console.log('\n--- decryptSeller動作確認 ---');
  if (visitScheduled && visitScheduled.length > 0) {
    const testSeller = visitScheduled[0];
    console.log('テスト売主:', testSeller.seller_number);
    console.log('  visit_date (raw):', testSeller.visit_date);
    console.log('  visit_date (Date):', testSeller.visit_date ? new Date(testSeller.visit_date) : null);
    console.log('  visit_assignee:', testSeller.visit_assignee);
  }
}

testSidebarAPI().catch(console.error);
