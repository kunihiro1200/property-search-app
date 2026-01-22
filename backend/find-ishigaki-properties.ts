import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function findIshigakiProperties() {
  console.log('=== 石垣の物件を検索 ===\n');

  const { data } = await supabase
    .from('sellers')
    .select('seller_number, property_address, distribution_areas')
    .ilike('property_address', '%石垣%')
    .limit(10);

  if (!data || data.length === 0) {
    console.log('石垣の物件が見つかりません');
    return;
  }

  console.log(`見つかった物件: ${data.length}件\n`);
  data.forEach((d) => {
    console.log(`${d.seller_number}: ${d.property_address}`);
    console.log(`  配信エリア: ${d.distribution_areas}`);
    console.log();
  });
}

findIshigakiProperties().catch(console.error);
