/**
 * データベースのvisit_assigneeフィールドの値を確認
 * どのような値が入っているか、件数はどれくらいかを調査
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== visit_assigneeフィールドの値を確認 ===\n');

  // 1. visit_assigneeに値がある売主を全て取得
  const { data: sellersWithAssignee, error: error1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .order('visit_date', { ascending: false });

  if (error1) {
    console.error('エラー:', error1);
    return;
  }

  console.log(`visit_assigneeに値がある売主: ${sellersWithAssignee?.length || 0}件\n`);

  // 2. visit_assigneeの値ごとにグループ化
  const assigneeGroups: Record<string, { count: number; sellers: string[] }> = {};
  
  sellersWithAssignee?.forEach(s => {
    const assignee = s.visit_assignee || '(空)';
    if (!assigneeGroups[assignee]) {
      assigneeGroups[assignee] = { count: 0, sellers: [] };
    }
    assigneeGroups[assignee].count++;
    if (assigneeGroups[assignee].sellers.length < 5) {
      assigneeGroups[assignee].sellers.push(`${s.seller_number} (${s.visit_date})`);
    }
  });

  console.log('=== visit_assigneeの値ごとの件数 ===');
  Object.entries(assigneeGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([assignee, data]) => {
      console.log(`\n"${assignee}": ${data.count}件`);
      console.log(`  例: ${data.sellers.join(', ')}`);
    });

  // 3. 今日の日付を確認
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log(`\n\n=== 今日の日付（JST）: ${todayJST} ===`);

  // 4. 訪問予定（今日以降）の件数
  const visitScheduled = sellersWithAssignee?.filter(s => {
    if (s.visit_assignee === '外す') return false;
    return s.visit_date && s.visit_date >= todayJST;
  }) || [];
  
  console.log(`\n訪問予定（今日以降）: ${visitScheduled.length}件`);
  visitScheduled.slice(0, 10).forEach(s => {
    console.log(`  ${s.seller_number}: ${s.visit_assignee} (${s.visit_date})`);
  });

  // 5. 訪問済み（昨日以前）の件数
  const visitCompleted = sellersWithAssignee?.filter(s => {
    if (s.visit_assignee === '外す') return false;
    return s.visit_date && s.visit_date < todayJST;
  }) || [];
  
  console.log(`\n訪問済み（昨日以前）: ${visitCompleted.length}件`);
  
  // 訪問済みを担当者ごとにグループ化
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

  // 6. スタッフ情報を確認
  console.log('\n\n=== スタッフ情報（employees テーブル） ===');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, initials, is_active')
    .order('name');

  if (empError) {
    console.error('スタッフ取得エラー:', empError);
  } else {
    console.log(`スタッフ数: ${employees?.length || 0}件`);
    employees?.forEach(emp => {
      console.log(`  ${emp.initials || '(なし)'} -> ${emp.name} (${emp.is_active ? 'アクティブ' : '非アクティブ'})`);
    });
  }
}

main().catch(console.error);
