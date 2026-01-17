import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAtbbStatusExact() {
  console.log('=== atbb_statusの正確な値を確認 ===\n');

  // すべての物件のatbb_statusを取得
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, sales_assignee, atbb_status')
    .not('atbb_status', 'is', null)
    .order('property_number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // 専任・公開中に関連する値を抽出
  const exclusivePublicVariants = new Map<string, number>();
  data?.forEach(p => {
    const status = p.atbb_status;
    if (status && status.includes('専任') && status.includes('公開')) {
      exclusivePublicVariants.set(status, (exclusivePublicVariants.get(status) || 0) + 1);
    }
  });

  console.log('「専任」と「公開」を含むatbb_statusの値:');
  exclusivePublicVariants.forEach((count, status) => {
    console.log(`  "${status}" (length: ${status.length}, bytes: ${Buffer.from(status).length}): ${count}件`);
    // 文字コードを表示
    console.log(`    文字コード: ${Array.from(status).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
  });

  // 山本さんの専任・公開中物件を確認
  console.log('\n山本さんの物件で「専任」と「公開」を含むもの:');
  const yamamotoExclusive = data?.filter(p => 
    p.sales_assignee === '山本' && 
    p.atbb_status && 
    p.atbb_status.includes('専任') && 
    p.atbb_status.includes('公開')
  );
  
  console.log(`合計: ${yamamotoExclusive?.length || 0}件`);
  
  if (yamamotoExclusive && yamamotoExclusive.length > 0) {
    const statusCounts = new Map<string, number>();
    yamamotoExclusive.forEach(p => {
      statusCounts.set(p.atbb_status, (statusCounts.get(p.atbb_status) || 0) + 1);
    });
    
    statusCounts.forEach((count, status) => {
      console.log(`  "${status}": ${count}件`);
    });
    
    console.log('\n最初の10件:');
    yamamotoExclusive.slice(0, 10).forEach(p => {
      console.log(`  ${p.property_number} - "${p.atbb_status}"`);
    });
  }
}

checkAtbbStatusExact().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
