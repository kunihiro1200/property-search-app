import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testCoordinatesFilter() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 座標フィルターのテスト\n');

  // 1. 全物件数
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 全物件数: ${totalCount}件`);

  // 2. 座標がある物件数
  const { count: withCoordinatesCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  console.log(`📍 座標がある物件数: ${withCoordinatesCount}件`);

  // 3. 座標がある物件を10件取得
  const { data: propertiesWithCoords, error } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(10);
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('\n✅ 座標がある物件（最初の10件）:');
  propertiesWithCoords?.forEach(p => {
    console.log(`  ${p.property_number}: (${p.latitude}, ${p.longitude})`);
  });

  // 4. 座標がnullの物件を10件取得
  const { data: propertiesWithoutCoords } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .limit(10);
  
  console.log('\n❌ 座標がない物件（最初の10件）:');
  propertiesWithoutCoords?.forEach(p => {
    console.log(`  ${p.property_number}: (${p.latitude}, ${p.longitude})`);
  });
}

testCoordinatesFilter().catch(console.error);
