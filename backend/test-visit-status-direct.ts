/**
 * 訪問予定/訪問済みのデータを直接データベースから確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testVisitStatus() {
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('=== 訪問予定/訪問済みテスト ===');
  console.log('今日の日付 (JST):', todayJST);
  
  // 訪問予定（営担あり AND 訪問日が今日以降）
  console.log('\n--- 訪問予定 (visitScheduled) ---');
  const { data: visitScheduled, error: err1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .is('deleted_at', null);
  
  if (err1) {
    console.error('Error:', err1);
  } else {
    console.log('件数:', visitScheduled?.length || 0);
    visitScheduled?.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.seller_number} - 営担: ${s.visit_assignee}, 訪問日: ${s.visit_date}`);
    });
  }
  
  // 訪問済み（営担あり AND 訪問日が昨日以前）
  console.log('\n--- 訪問済み (visitCompleted) ---');
  const { data: visitCompleted, error: err2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .is('deleted_at', null)
    .limit(20);
  
  if (err2) {
    console.error('Error:', err2);
  } else {
    console.log('件数:', visitCompleted?.length || 0);
    visitCompleted?.slice(0, 10).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.seller_number} - 営担: ${s.visit_assignee}, 訪問日: ${s.visit_date}`);
    });
  }
  
  // サイドバーカウントAPIの動作を確認
  console.log('\n--- サイドバーカウント確認 ---');
  
  // 訪問予定の件数
  const { count: visitScheduledCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .is('deleted_at', null);
  
  console.log('訪問予定 (visitScheduled):', visitScheduledCount);
  
  // 訪問済みの件数
  const { count: visitCompletedCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .is('deleted_at', null);
  
  console.log('訪問済み (visitCompleted):', visitCompletedCount);
}

testVisitStatus().catch(console.error);
