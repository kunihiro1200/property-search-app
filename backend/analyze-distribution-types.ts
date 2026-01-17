import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function analyzeDistributionTypes() {
  console.log('=== 配信フラグの分析 ===\n');

  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, distribution_type, email')
    .not('email', 'is', null)
    .neq('email', '');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  const distributionTypes = new Map<string, number>();

  buyers.forEach(buyer => {
    const type = buyer.distribution_type || 'null';
    distributionTypes.set(type, (distributionTypes.get(type) || 0) + 1);
  });

  console.log('全買主の配信フラグ分布:');
  Array.from(distributionTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  "${type}": ${count}件`);
    });

  console.log('\n配信対象と思われるフラグ:');
  console.log('  "要": メール配信を希望');
  console.log('  "mail": メール配信を希望（別の表記）');
  console.log('  "不要": 配信不要');
  console.log('  "ｍ→不要": 配信不要に変更');
  console.log('  "メールエラー": メールエラー');

  console.log('\n推奨: "要" または "mail" を配信対象とする');
}

analyzeDistributionTypes().catch(console.error);
