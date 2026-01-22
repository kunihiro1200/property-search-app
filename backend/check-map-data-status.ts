import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMapDataStatus() {
  console.log('🔍 地図データの状況を確認中...\n');
  
  // サンプルデータを取得
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, address, latitude, longitude')
    .limit(10);
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  console.log('📋 物件データサンプル（最初の10件）:');
  data?.forEach(p => {
    console.log('---');
    console.log('物件番号:', p.property_number);
    console.log('Google Map URL:', p.google_map_url ? '✅ あり' : '❌ なし');
    console.log('住所:', p.address ? '✅ あり' : '❌ なし');
    console.log('座標:', p.latitude && p.longitude ? `✅ (${p.latitude}, ${p.longitude})` : '❌ なし');
  });
  
  // 統計を取得
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  const { count: withCoords } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  const { count: withMapUrl } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('google_map_url', 'is', null);
  
  const { count: withAddress } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('address', 'is', null);
  
  console.log('\n📊 統計:');
  console.log('全物件数:', totalCount);
  console.log('座標あり:', withCoords, `(${((withCoords!/totalCount!)*100).toFixed(1)}%)`);
  console.log('Google Map URLあり:', withMapUrl, `(${((withMapUrl!/totalCount!)*100).toFixed(1)}%)`);
  console.log('住所あり:', withAddress, `(${((withAddress!/totalCount!)*100).toFixed(1)}%)`);
  
  // 座標がないがGoogle Map URLがある物件
  const { count: noCoordButHasUrl } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('latitude', null)
    .not('google_map_url', 'is', null);
  
  // 座標がないがAddressがある物件
  const { count: noCoordButHasAddress } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('latitude', null)
    .not('address', 'is', null);
  
  console.log('\n🎯 座標化可能な物件:');
  console.log('座標なし + Google Map URLあり:', noCoordButHasUrl, '件');
  console.log('座標なし + 住所あり:', noCoordButHasAddress, '件');
}

checkMapDataStatus();
