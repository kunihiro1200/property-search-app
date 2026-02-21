/**
 * 訪問予定クエリのデバッグ
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function debugVisitScheduledQuery() {
  console.log('=== 訪問予定クエリデバッグ ===\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 今日の日付（JST）
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('今日の日付（JST）:', todayJST);
  console.log('');
  
  // 1. visit_assigneeが設定されている売主を確認
  console.log('--- 1. visit_assigneeが設定されている売主 ---');
  const { data: withAssignee, error: error1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .is('deleted_at', null)
    .limit(20);
  
  if (error1) {
    console.error('エラー:', error1.message);
  } else {
    console.log(`件数: ${withAssignee?.length || 0}`);
    withAssignee?.forEach((s: any) => {
      console.log(`  ${s.seller_number}: visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  console.log('');
  
  // 2. 訪問予定（visit_date >= today）
  console.log('--- 2. 訪問予定（visit_date >= today） ---');
  const { data: visitScheduled, error: error2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .is('deleted_at', null)
    .limit(20);
  
  if (error2) {
    console.error('エラー:', error2.message);
  } else {
    console.log(`件数: ${visitScheduled?.length || 0}`);
    visitScheduled?.forEach((s: any) => {
      console.log(`  ${s.seller_number}: visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  console.log('');
  
  // 3. 訪問済み（visit_date < today）
  console.log('--- 3. 訪問済み（visit_date < today） ---');
  const { data: visitCompleted, error: error3 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .is('deleted_at', null)
    .limit(20);
  
  if (error3) {
    console.error('エラー:', error3.message);
  } else {
    console.log(`件数: ${visitCompleted?.length || 0}`);
    visitCompleted?.forEach((s: any) => {
      console.log(`  ${s.seller_number}: visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  
  console.log('\n=== デバッグ完了 ===');
}

debugVisitScheduledQuery().catch(console.error);
