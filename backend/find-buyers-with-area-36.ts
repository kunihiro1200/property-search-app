import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function findBuyersWithArea36() {
  console.log('㊶（別府市全体）を持っている買主を検索します...\n');

  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, distribution_type')
    .ilike('desired_area', '%㊶%')
    .order('buyer_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`㊶を持っている買主: ${buyers?.length || 0}件\n`);

  if (!buyers || buyers.length === 0) {
    console.log('㊶を持っている買主が見つかりません');
    return;
  }

  buyers.forEach(b => {
    console.log(`買主${b.buyer_number}: ${b.email}`);
    console.log(`  希望エリア: ${b.desired_area}`);
    console.log(`  配信タイプ: ${b.distribution_type}`);
    console.log('');
  });
}

findBuyersWithArea36()
  .then(() => {
    console.log('検索完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
