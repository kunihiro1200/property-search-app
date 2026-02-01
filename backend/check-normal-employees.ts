/**
 * 通常=trueの従業員を確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 従業員テーブルを確認 ===\n');

  // 全従業員を取得
  const { data: allEmployees, error: error1 } = await supabase
    .from('employees')
    .select('*')
    .order('initials');

  if (error1) {
    console.error('エラー:', error1);
    return;
  }

  console.log('全従業員:');
  allEmployees?.forEach(e => {
    console.log(`  ${e.initials}: ${e.name}, 通常=${e.is_normal}, アクティブ=${e.is_active}`);
  });

  // 通常=trueの従業員のみ
  const { data: normalEmployees, error: error2 } = await supabase
    .from('employees')
    .select('initials, name')
    .eq('is_normal', true);

  if (error2) {
    console.error('エラー:', error2);
    return;
  }

  console.log('\n通常=trueの従業員:');
  normalEmployees?.forEach(e => {
    console.log(`  ${e.initials}: ${e.name}`);
  });

  const normalInitials = normalEmployees?.map(e => e.initials) || [];
  console.log('\n通常=trueのイニシャル一覧:', normalInitials.join(', '));

  // 売主のvisit_assigneeの値を確認
  const { data: assigneeValues, error: error3 } = await supabase
    .from('sellers')
    .select('visit_assignee')
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '');

  if (error3) {
    console.error('エラー:', error3);
    return;
  }

  // ユニークな値を集計
  const assigneeCounts: Record<string, number> = {};
  assigneeValues?.forEach(s => {
    const val = s.visit_assignee;
    assigneeCounts[val] = (assigneeCounts[val] || 0) + 1;
  });

  console.log('\n売主のvisit_assigneeの値（全て）:');
  Object.entries(assigneeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([val, count]) => {
      const isNormal = normalInitials.includes(val);
      console.log(`  "${val}": ${count}件 ${isNormal ? '✅ 通常' : '❌ 通常外'}`);
    });

  // 通常=trueのイニシャルのみでフィルタリングした場合の件数
  const normalAssigneeCount = Object.entries(assigneeCounts)
    .filter(([val]) => normalInitials.includes(val))
    .reduce((sum, [, count]) => sum + count, 0);

  console.log(`\n通常=trueの営担がある売主: ${normalAssigneeCount}件`);
}

main().catch(console.error);
