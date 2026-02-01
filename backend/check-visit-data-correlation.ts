/**
 * visit_assigneeとvisit_dateの相関を確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== visit_assigneeとvisit_dateの相関を確認 ===\n');

  // 1. visit_assigneeがあり、visit_dateもある売主
  const { data: both, error: error1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .not('visit_date', 'is', null)
    .order('visit_date', { ascending: false });

  console.log(`visit_assigneeとvisit_dateの両方がある売主: ${both?.length || 0}件`);
  both?.slice(0, 20).forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee}", 訪問日="${s.visit_date}"`);
  });

  // 2. visit_dateがあるが、visit_assigneeがない売主
  const { data: dateOnly, error: error2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_date', 'is', null)
    .or('visit_assignee.is.null,visit_assignee.eq.')
    .order('visit_date', { ascending: false });

  console.log(`\nvisit_dateはあるが、visit_assigneeがない売主: ${dateOnly?.length || 0}件`);
  dateOnly?.slice(0, 10).forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee || '(空)'}", 訪問日="${s.visit_date}"`);
  });

  // 3. 今日の日付
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log(`\n今日の日付（JST）: ${todayJST}`);

  // 4. 訪問予定（今日以降）
  const visitScheduled = both?.filter(s => {
    if (s.visit_assignee === '外す') return false;
    return s.visit_date >= todayJST;
  }) || [];
  
  console.log(`\n訪問予定（今日以降）: ${visitScheduled.length}件`);
  visitScheduled.forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee}", 訪問日="${s.visit_date}"`);
  });

  // 5. 訪問済み（昨日以前）
  const visitCompleted = both?.filter(s => {
    if (s.visit_assignee === '外す') return false;
    return s.visit_date < todayJST;
  }) || [];
  
  console.log(`\n訪問済み（昨日以前）: ${visitCompleted.length}件`);
  
  // 担当者別
  const completedByAssignee: Record<string, number> = {};
  visitCompleted.forEach(s => {
    const assignee = s.visit_assignee || '(空)';
    completedByAssignee[assignee] = (completedByAssignee[assignee] || 0) + 1;
  });
  
  console.log('\n訪問済みの担当者別件数:');
  Object.entries(completedByAssignee)
    .sort((a, b) => b[1] - a[1])
    .forEach(([assignee, count]) => {
      console.log(`  "${assignee}": ${count}件`);
    });
}

main().catch(console.error);
