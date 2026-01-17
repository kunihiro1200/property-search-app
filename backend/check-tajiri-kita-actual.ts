// 大分市田尻北3-14の実際のデータを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTajiriKitaActual() {
  console.log('=== 大分市田尻北3-14の実際のデータ確認 ===\n');

  // 住所で検索
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('*')
    .ilike('address', '%田尻北%')
    .limit(5);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('❌ 田尻北の物件が見つかりませんでした');
    return;
  }

  console.log(`📍 見つかった物件: ${properties.length}件\n`);

  properties.forEach((prop, index) => {
    console.log(`--- 物件 ${index + 1} ---`);
    console.log(`住所: ${prop.address}`);
    console.log(`市: ${prop.city}`);
    console.log(`Google Map URL: ${prop.google_map_url || 'なし'}`);
    console.log(`配信エリア: ${prop.distribution_areas || 'なし'}`);
    console.log('');
  });
}

checkTajiriKitaActual();
