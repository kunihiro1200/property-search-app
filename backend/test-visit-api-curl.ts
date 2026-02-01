/**
 * バックエンドAPIを直接呼び出して訪問予定/訪問済みのデータを確認
 */

import dotenv from 'dotenv';
// .env.localを先に読み込んで優先させる
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
// .env.localではSUPABASE_SERVICE_KEYという名前
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('SUPABASE_URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== データベースから直接訪問データを確認 ===');
  console.log('');
  
  const today = new Date();
  const todayJST = today.toISOString().split('T')[0];
  console.log('今日の日付（JST）:', todayJST);
  console.log('');
  
  // 訪問予定の条件でクエリ
  console.log('--- 訪問予定（バックエンドと同じクエリ） ---');
  const { data: visitScheduled, error: err1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee, name')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .is('deleted_at', null)
    .limit(20);
  
  if (err1) {
    console.error('エラー:', err1);
  } else {
    console.log('訪問予定件数:', visitScheduled?.length || 0);
    visitScheduled?.forEach(s => {
      console.log(`  ${s.seller_number} (${s.name}): visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  
  console.log('');
  
  // 訪問済みの条件でクエリ
  console.log('--- 訪問済み（バックエンドと同じクエリ） ---');
  const { data: visitCompleted, error: err2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee, name')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .is('deleted_at', null)
    .limit(20);
  
  if (err2) {
    console.error('エラー:', err2);
  } else {
    console.log('訪問済み件数:', visitCompleted?.length || 0);
    visitCompleted?.slice(0, 10).forEach(s => {
      console.log(`  ${s.seller_number} (${s.name}): visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  
  console.log('');
  
  // visit_dateとvisit_assigneeの両方に値がある売主を確認
  console.log('--- visit_dateとvisit_assigneeの両方に値がある売主 ---');
  const { data: withBoth, error: err3 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee, name')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .not('visit_date', 'is', null)
    .is('deleted_at', null)
    .order('visit_date', { ascending: false })
    .limit(30);
  
  if (err3) {
    console.error('エラー:', err3);
  } else {
    console.log('両方に値がある売主件数:', withBoth?.length || 0);
    withBoth?.forEach(s => {
      const isScheduled = s.visit_date >= todayJST;
      const label = isScheduled ? '【予定】' : '【済み】';
      console.log(`  ${label} ${s.seller_number} (${s.name}): visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  
  console.log('');
  
  // 全売主数を確認
  console.log('--- 全売主数 ---');
  const { count, error: err4 } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  if (err4) {
    console.error('エラー:', err4);
  } else {
    console.log('全売主数:', count);
  }
}

main().catch(console.error);
