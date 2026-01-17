import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDistributionFlag() {
  console.log('=== 配信フラグの値を確認 ===\n');

  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, distribution_type')
    .not('email', 'is', null)
    .neq('email', '')
    .limit(50);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  const distributionTypes = new Map<string, number>();

  buyers.forEach(buyer => {
    const type = buyer.distribution_type || 'null';
    distributionTypes.set(type, (distributionTypes.get(type) || 0) + 1);
  });

  console.log('配信フラグの値と件数:');
  Array.from(distributionTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  "${type}": ${count}件`);
    });

  console.log('\n買主1847の配信フラグ:');
  const { data: buyer1847 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1847')
    .single();

  if (buyer1847) {
    console.log('  買主番号:', buyer1847.buyer_number);
    console.log('  配信フラグ:', `"${buyer1847.distribution_type}"`);
    console.log('  配信フラグ (trim):', `"${buyer1847.distribution_type?.trim()}"`);
    console.log('  配信フラグ === "要":', buyer1847.distribution_type?.trim() === '要');
  }
}

checkDistributionFlag().catch(console.error);
