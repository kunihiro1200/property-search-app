import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkVisitData() {
  const today = new Date();
  const todayJST = today.toISOString().split('T')[0];
  console.log('今日の日付（JST）:', todayJST);
  
  // 訪問予定の条件でクエリ
  console.log('\n=== 訪問予定（バックエンドと同じクエリ） ===');
  const { data: visitScheduled, error: err1 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
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
      console.log('  ', s.seller_number, '| visit_date:', s.visit_date, '| visit_assignee:', s.visit_assignee);
    });
  }
  
  // 訪問済みの条件でクエリ
  console.log('\n=== 訪問済み（バックエンドと同じクエリ） ===');
  const { data: visitCompleted, error: err2 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
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
      console.log('  ', s.seller_number, '| visit_date:', s.visit_date, '| visit_assignee:', s.visit_assignee);
    });
  }
  
  // visit_dateとvisit_assigneeの両方に値がある売主を確認
  console.log('\n=== visit_dateとvisit_assigneeの両方に値がある売主 ===');
  const { data: withBoth, error: err3 } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .not('visit_date', 'is', null)
    .is('deleted_at', null)
    .limit(30);
  
  if (err3) {
    console.error('エラー:', err3);
  } else {
    console.log('両方に値がある売主件数:', withBoth?.length || 0);
    withBoth?.forEach(s => {
      console.log('  ', s.seller_number, '| visit_date:', s.visit_date, '| visit_assignee:', s.visit_assignee);
    });
  }
}

checkVisitData().catch(console.error);
