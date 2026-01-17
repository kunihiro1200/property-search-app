import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyDBExclusiveContracts() {
  console.log('=== データベースの2025年11月専任媒介データを検証 ===\n');

  const startDate = new Date(2025, 10, 1).toISOString(); // 2025-11-01
  const endDate = new Date(2025, 10, 30, 23, 59, 59).toISOString(); // 2025-11-30

  console.log(`期間: ${startDate} ~ ${endDate}\n`);

  // 専任媒介の件数を取得
  const { data, error, count } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, visit_date, confidence', { count: 'exact' })
    .eq('status', '専任媒介')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .not('confidence', 'in', '("D","ダブり")');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`専任媒介の件数: ${count}件\n`);

  if (data && data.length > 0) {
    console.log('=== 詳細データ ===');
    data.forEach((row, index) => {
      console.log(`${index + 1}. 売主番号: ${row.seller_number}`);
      console.log(`   状況: ${row.status}`);
      console.log(`   営担: ${row.visit_assignee}`);
      console.log(`   訪問日: ${row.visit_date}`);
      console.log(`   確度: ${row.confidence}`);
      console.log('');
    });

    // 営担別の集計
    const assigneeCounts: { [key: string]: number } = {};
    data.forEach(row => {
      const assignee = row.visit_assignee;
      if (assignee) {
        assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
      }
    });

    console.log('\n=== 営担別の専任媒介件数 ===');
    Object.entries(assigneeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([assignee, count]) => {
        console.log(`${assignee}: ${count}件`);
      });
  }

  // すべての2025年11月の訪問日を持つデータを確認
  console.log('\n\n=== 2025年11月の訪問日を持つすべてのデータ ===');
  const { data: allVisits, error: allError, count: allCount } = await supabase
    .from('sellers')
    .select('seller_number, status, visit_assignee, visit_date', { count: 'exact' })
    .gte('visit_date', startDate)
    .lte('visit_date', endDate)
    .not('confidence', 'in', '("D","ダブり")');

  if (allError) {
    console.error('エラー:', allError);
    return;
  }

  console.log(`2025年11月の訪問日を持つデータ: ${allCount}件\n`);

  if (allVisits && allVisits.length > 0) {
    allVisits.forEach((row, index) => {
      console.log(`${index + 1}. 売主番号: ${row.seller_number}`);
      console.log(`   状況: ${row.status}`);
      console.log(`   営担: ${row.visit_assignee}`);
      console.log(`   訪問日: ${row.visit_date}`);
      console.log('');
    });
  }
}

verifyDBExclusiveContracts();
