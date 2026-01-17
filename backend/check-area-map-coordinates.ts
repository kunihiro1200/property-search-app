// エリアマップ設定の座標を確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAreaMapCoordinates() {
  console.log('=== エリアマップ設定の座標確認 ===\n');

  const { data, error } = await supabase
    .from('area_map_config')
    .select('*')
    .order('area_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('📍 各エリアの座標:\n');
  
  data?.forEach(area => {
    console.log(`${area.area_number}: ${area.area_name}`);
    if (area.coordinates) {
      const coords = typeof area.coordinates === 'string' 
        ? JSON.parse(area.coordinates) 
        : area.coordinates;
      console.log(`  座標: lat=${coords.lat}, lng=${coords.lng}`);
    } else {
      console.log(`  座標: なし（市全域エリア）`);
    }
    console.log('');
  });

  // 大分市田尻北の座標（おおよそ）
  const tajiriKitaCoords = {
    lat: 33.2382,  // 仮の座標
    lng: 131.6126
  };

  console.log('\n🎯 大分市田尻北3-14からの距離（仮の座標で計算）:');
  console.log(`基準座標: lat=${tajiriKitaCoords.lat}, lng=${tajiriKitaCoords.lng}\n`);

  // Haversine公式で距離を計算
  const calculateDistance = (point1: any, point2: any): number => {
    const R = 6371; // 地球の半径 (km)
    
    const toRad = (degrees: number) => degrees * (Math.PI / 180);
    
    const dLat = toRad(point2.lat - point1.lat);
    const dLon = toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  const distances = data
    ?.filter(area => area.coordinates)
    .map(area => {
      const coords = typeof area.coordinates === 'string' 
        ? JSON.parse(area.coordinates) 
        : area.coordinates;
      const distance = calculateDistance(tajiriKitaCoords, coords);
      return {
        areaNumber: area.area_number,
        areaName: area.area_name,
        distance: distance,
        within3km: distance <= 3
      };
    })
    .sort((a, b) => a.distance - b.distance);

  distances?.forEach(item => {
    const status = item.within3km ? '✅ 3km以内' : '❌ 3km超';
    console.log(`${item.areaNumber} (${item.areaName}): ${item.distance.toFixed(2)}km ${status}`);
  });

  const within3km = distances?.filter(d => d.within3km) || [];
  console.log(`\n📊 3km以内のエリア: ${within3km.length}個`);
  console.log(`配信対象エリア: ${within3km.map(d => d.areaNumber).join(', ')}`);
}

checkAreaMapCoordinates();
