import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GeolocationService } from './src/services/GeolocationService';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const geolocationService = new GeolocationService();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * 住所から座標を取得（Google Geocoding API）
 */
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('❌ GOOGLE_MAPS_API_KEY が設定されていません');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_MAPS_API_KEY}&language=ja&region=jp`;
    
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } else {
      console.log(`  ⚠️ Geocoding status: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding exception:', error);
    return null;
  }
}

async function testBackfill() {
  console.log('🧪 座標バックフィルのテスト（最初の10件）\n');
  
  // 座標がない物件を10件取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, address, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .limit(10);
  
  if (error) {
    console.error('❌ 物件取得エラー:', error);
    return;
  }
  
  console.log(`📊 テスト対象: ${properties?.length}件\n`);
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (const property of properties || []) {
    console.log(`\n処理中: ${property.property_number}`);
    console.log(`  Google Map URL: ${property.google_map_url ? '✅' : '❌'}`);
    console.log(`  住所: ${property.address || '❌'}`);
    
    let coords: { latitude: number; longitude: number } | null = null;
    
    // 1. Google Map URLから座標を抽出
    if (property.google_map_url) {
      console.log('  📍 Google Map URLから座標を抽出中...');
      const urlCoords = await geolocationService.extractCoordinatesFromUrl(property.google_map_url);
      
      if (urlCoords) {
        coords = {
          latitude: urlCoords.lat,
          longitude: urlCoords.lng,
        };
        console.log(`  ✅ URLから座標取得成功: (${coords.latitude}, ${coords.longitude})`);
      } else {
        console.log('  ⚠️ URLから座標を抽出できませんでした');
      }
    }
    
    // 2. 座標が取得できなかった場合、住所からジオコーディング
    if (!coords && property.address) {
      console.log('  🗺️ 住所からジオコーディング中...');
      coords = await geocodeAddress(property.address);
      
      if (coords) {
        console.log(`  ✅ 住所から座標取得成功: (${coords.latitude}, ${coords.longitude})`);
      } else {
        console.log('  ⚠️ 住所から座標を取得できませんでした');
      }
    }
    
    // 3. 結果を表示（テストなので保存しない）
    if (coords) {
      console.log(`  💡 保存予定の座標: (${coords.latitude}, ${coords.longitude})`);
      successCount++;
    } else {
      console.log('  ⏭️ スキップ（座標を取得できませんでした）');
      skippedCount++;
    }
    
    // レート制限を回避
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n\n📊 テスト結果:');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`⏭️ スキップ: ${skippedCount}件`);
  console.log(`📈 合計: ${properties?.length}件`);
  console.log('\n💡 実際のバックフィルを実行するには backfill-all-property-coordinates.ts を使用してください');
}

testBackfill();
