import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 複数の.envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const today = new Date();
  const todayJST = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = todayJST.toISOString().split('T')[0];
  
  console.log('今日の日付 (JST):', todayStr);
  
  // 訪問予定（営担あり + 訪問日が今日以降）
  const { data: visitScheduled, count: visitScheduledCount } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date', { count: 'exact' })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayStr)
    .limit(10);
  
  console.log('\n=== 訪問予定 ===');
  console.log('件数:', visitScheduledCount);
  if (visitScheduled && visitScheduled.length > 0) {
    visitScheduled.forEach(s => console.log(s.seller_number, '営担:', s.visit_assignee, '訪問日:', s.visit_date));
  }
  
  // 訪問済み（営担あり + 訪問日が昨日以前）
  const { data: visitCompleted, count: visitCompletedCount } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date', { count: 'exact' })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayStr)
    .limit(10);
  
  console.log('\n=== 訪問済み ===');
  console.log('件数:', visitCompletedCount);
  if (visitCompleted && visitCompleted.length > 0) {
    visitCompleted.forEach(s => console.log(s.seller_number, '営担:', s.visit_assignee, '訪問日:', s.visit_date));
  }
  
  // 営担があるが訪問日がない売主
  const { data: assignedNoVisit, count: assignedNoVisitCount } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date', { count: 'exact' })
    .is('deleted_at', null)
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .is('visit_date', null)
    .limit(10);
  
  console.log('\n=== 営担あり・訪問日なし ===');
  console.log('件数:', assignedNoVisitCount);
  if (assignedNoVisit && assignedNoVisit.length > 0) {
    assignedNoVisit.forEach(s => console.log(s.seller_number, '営担:', s.visit_assignee, '訪問日:', s.visit_date));
  }
}

check().catch(console.error);
