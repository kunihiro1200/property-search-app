import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkExclusiveYStatus() {
  console.log('=== Y専任公開中のステータス確認 ===\n');

  // 1. 専任・公開中の物件数を確認
  const { data: exclusivePublic, error: error1 } = await supabase
    .from('property_listings')
    .select('property_number, sales_assignee, atbb_status')
    .eq('atbb_status', '専任・公開中');

  if (error1) {
    console.error('Error:', error1);
    return;
  }

  console.log(`専任・公開中の物件数: ${exclusivePublic?.length || 0}`);
  
  // 2. 担当者別の内訳
  const assigneeCounts: Record<string, number> = {};
  exclusivePublic?.forEach(p => {
    const assignee = p.sales_assignee || '未設定';
    assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
  });

  console.log('\n担当者別の内訳:');
  Object.entries(assigneeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([assignee, count]) => {
      console.log(`  ${assignee}: ${count}件`);
    });

  // 3. 山本さんの物件を確認
  const yamamoto = exclusivePublic?.filter(p => p.sales_assignee === '山本');
  console.log(`\n山本さんの専任・公開中物件: ${yamamoto?.length || 0}件`);
  if (yamamoto && yamamoto.length > 0) {
    console.log('最初の5件:');
    yamamoto.slice(0, 5).forEach(p => {
      console.log(`  ${p.property_number} - ${p.sales_assignee}`);
    });
  }

  // 4. atbb_statusの値を確認
  const { data: allStatuses, error: error2 } = await supabase
    .from('property_listings')
    .select('atbb_status')
    .not('atbb_status', 'is', null);

  if (error2) {
    console.error('Error:', error2);
    return;
  }

  const statusCounts: Record<string, number> = {};
  allStatuses?.forEach(p => {
    const status = p.atbb_status || '未設定';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('\natbb_statusの値の内訳:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}件`);
    });

  // 5. sales_assigneeの値を確認
  const { data: allAssignees, error: error3 } = await supabase
    .from('property_listings')
    .select('sales_assignee');

  if (error3) {
    console.error('Error:', error3);
    return;
  }

  const assigneeAllCounts: Record<string, number> = {};
  allAssignees?.forEach(p => {
    const assignee = p.sales_assignee || '未設定';
    assigneeAllCounts[assignee] = (assigneeAllCounts[assignee] || 0) + 1;
  });

  console.log('\nsales_assigneeの値の内訳（全物件）:');
  Object.entries(assigneeAllCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([assignee, count]) => {
      console.log(`  ${assignee}: ${count}件`);
    });
}

checkExclusiveYStatus().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
