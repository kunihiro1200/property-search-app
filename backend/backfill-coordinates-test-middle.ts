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

// テスト設定
const OFFSET = 500; // 開始位置（500件目から）
const LIMIT = 10;   // テスト件数

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

async function testBackfillMiddle() {
  console.log(`🧪 座標バックフィルのテスト（${OFFSET}件目から${LIMIT}件）\n`);
  
  // 座標がない物件を指定位置から取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, address, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .order('property_number', { ascending: true })
    .range(OFFSET, OFFSET + LIMIT - 1);
  
  if (error) {
    console.error('❌ 物件取得エラー:', error);
    return;
  }
  
  console.log(`📊 テスト対象: ${properties?.length}件（${OFFSET + 1}〜${OFFSET + (properties?.length || 0)}件目）\n`);
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  const results: any[] = [];
  
  for (const property of properties || []) {
    console.log(`\n処理中: ${property.property_number} (${OFFSET + results.length + 1}件目)`);
    console.log(`  Google Map URL: ${property.google_map_url ? '✅' : '❌'}`);
    console.log(`  住所: ${property.address || '❌'}`);
    
    let coords: { latitude: number; longitude: number } | null = null;
    let source = '';
    
    // 1. Google Map URLから座標を抽出
    if (property.google_map_url) {
      console.log('  📍 Google Map URLから座標を抽出中...');
      const urlCoords = await geolocationService.extractCoordinatesFromUrl(property.google_map_url);
      
      if (urlCoords) {
        coords = {
          latitude: urlCoords.lat,
          longitude: urlCoords.lng,
        };
        source = 'Google Map URL';
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
        source = '住所（Geocoding API）';
        console.log(`  ✅ 住所から座標取得成功: (${coords.latitude}, ${coords.longitude})`);
      } else {
        console.log('  ⚠️ 住所から座標を取得できませんでした');
      }
    }
    
    // 3. 結果を記録（テストなので保存しない）
    if (coords) {
      console.log(`  💡 保存予定の座標: (${coords.latitude}, ${coords.longitude})`);
      console.log(`  📌 取得元: ${source}`);
      results.push({
        property_number: property.property_number,
        address: property.address,
        source,
        latitude: coords.latitude,
        longitude: coords.longitude,
        success: true,
      });
      successCount++;
    } else {
      console.log('  ⏭️ スキップ（座標を取得できませんでした）');
      results.push({
        property_number: property.property_number,
        address: property.address,
        source: 'なし',
        success: false,
      });
      skippedCount++;
    }
    
    // レート制限を回避
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n\n📊 テスト結果:');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`⏭️ スキップ: ${skippedCount}件（住所なし）`);
  console.log(`📈 合計: ${properties?.length}件`);
  console.log(`📊 成功率: ${((successCount / (properties?.length || 1)) * 100).toFixed(1)}%`);
  
  console.log('\n\n📋 詳細結果:');
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`${index + 1}. ${result.property_number}: ✅ ${result.source}`);
      console.log(`   住所: ${result.address}`);
      console.log(`   座標: (${result.latitude}, ${result.longitude})`);
    } else {
      console.log(`${index + 1}. ${result.property_number}: ❌ スキップ`);
      console.log(`   住所: ${result.address || 'なし'}`);
    }
  });
  
  console.log('\n💡 実際のバックフィルを実行するには backfill-all-property-coordinates.ts を使用してください');
}

testBackfillMiddle();
