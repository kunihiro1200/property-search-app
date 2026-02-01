/**
 * visit_assigneeとvisit_dateの片方しかない売主を具体的に確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== visit_assigneeとvisit_dateの不一致を確認 ===\n');

  // 1. visit_assigneeがあるが、visit_dateがない売主（上位20件）
  const { data: assigneeOnly, error: error1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .is('visit_date', null)
    .order('seller_number', { ascending: false })
    .limit(30);

  if (error1) {
    console.error('エラー1:', error1);
    return;
  }

  console.log(`【営担あり・訪問日なし】の売主: ${assigneeOnly?.length}件以上`);
  console.log('具体例（最新30件）:');
  assigneeOnly?.forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee}", 訪問日="${s.visit_date || '(null)'}"`);
  });

  // 2. visit_dateがあるが、visit_assigneeがない売主
  const { data: dateOnly, error: error2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_date', 'is', null)
    .or('visit_assignee.is.null,visit_assignee.eq.')
    .order('visit_date', { ascending: false })
    .limit(20);

  if (error2) {
    console.error('エラー2:', error2);
    return;
  }

  console.log(`\n【訪問日あり・営担なし】の売主: ${dateOnly?.length}件`);
  dateOnly?.forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee || '(空)'}", 訪問日="${s.visit_date}"`);
  });

  // 3. 両方ある売主
  const { data: both, error: error3 } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date')
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .not('visit_date', 'is', null)
    .order('visit_date', { ascending: false })
    .limit(50);

  if (error3) {
    console.error('エラー3:', error3);
    return;
  }

  console.log(`\n【両方あり】の売主: ${both?.length}件`);
  both?.forEach(s => {
    console.log(`  ${s.seller_number}: 営担="${s.visit_assignee}", 訪問日="${s.visit_date}"`);
  });

  // 4. 件数サマリー
  const { count: assigneeOnlyCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .is('visit_date', null);

  const { count: dateOnlyCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('visit_date', 'is', null)
    .or('visit_assignee.is.null,visit_assignee.eq.,visit_assignee.eq.外す');

  const { count: bothCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .not('visit_date', 'is', null);

  console.log('\n=== サマリー ===');
  console.log(`営担あり・訪問日なし: ${assigneeOnlyCount}件`);
  console.log(`訪問日あり・営担なし: ${dateOnlyCount}件`);
  console.log(`両方あり: ${bothCount}件`);
}

main().catch(console.error);
