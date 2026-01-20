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
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding exception:', error);
    return null;
  }
}

async function backfillAllCoordinates() {
  console.log('🚀 全物件の座標バックフィル開始...\n');
  
  // 座標がない物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, address, latitude, longitude')
    .or('latitude.is.null,longitude.is.null');
  
  if (error) {
    console.error('❌ 物件取得エラー:', error);
    return;
  }
  
  console.log(`📊 座標がない物件: ${properties?.length}件\n`);
  
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  
  for (const property of properties || []) {
    console.log(`\n処理中: ${property.property_number}`);
    
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
    
    // 3. データベースに保存
    if (coords) {
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', property.id);
      
      if (updateError) {
        console.log(`  ❌ 保存エラー:`, updateError.message);
        failCount++;
      } else {
        console.log(`  💾 データベースに保存しました`);
        successCount++;
      }
    } else {
      console.log('  ⏭️ スキップ（座標を取得できませんでした）');
      skippedCount++;
    }
    
    // Google Geocoding APIのレート制限を回避するため、少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n📊 バックフィル完了:');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ 失敗: ${failCount}件`);
  console.log(`⏭️ スキップ: ${skippedCount}件`);
  console.log(`📈 合計: ${properties?.length}件`);
  
  // 最終統計
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  const { count: withCoords } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  console.log('\n📍 最終統計:');
  console.log(`全物件数: ${totalCount}件`);
  console.log(`座標あり: ${withCoords}件 (${((withCoords!/totalCount!)*100).toFixed(1)}%)`);
}

backfillAllCoordinates();
