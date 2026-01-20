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

async function backfillAA10424() {
  console.log('🚀 AA10424の座標をバックフィル\n');
  
  // AA10424を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, address, latitude, longitude')
    .eq('property_number', 'AA10424');
  
  if (error) {
    console.error('❌ 物件取得エラー:', error);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ AA10424が見つかりません');
    return;
  }
  
  const property = properties[0];
  console.log(`物件番号: ${property.property_number}`);
  console.log(`Google Map URL: ${property.google_map_url || 'なし'}`);
  console.log(`住所: ${property.address || 'なし'}`);
  console.log(`現在の座標: ${property.latitude && property.longitude ? `(${property.latitude}, ${property.longitude})` : 'なし'}`);
  
  let coords: { latitude: number; longitude: number } | null = null;
  
  // 1. Google Map URLから座標を抽出
  if (property.google_map_url) {
    console.log('\n📍 Google Map URLから座標を抽出中...');
    const urlCoords = await geolocationService.extractCoordinatesFromUrl(property.google_map_url);
    
    if (urlCoords) {
      coords = {
        latitude: urlCoords.lat,
        longitude: urlCoords.lng,
      };
      console.log(`✅ URLから座標取得成功: (${coords.latitude}, ${coords.longitude})`);
    } else {
      console.log('⚠️ URLから座標を抽出できませんでした');
    }
  }
  
  // 2. 座標が取得できなかった場合、住所からジオコーディング
  if (!coords && property.address) {
    console.log('\n🗺️ 住所からジオコーディング中...');
    coords = await geocodeAddress(property.address);
    
    if (coords) {
      console.log(`✅ 住所から座標取得成功: (${coords.latitude}, ${coords.longitude})`);
    } else {
      console.log('⚠️ 住所から座標を取得できませんでした');
    }
  }
  
  // 3. データベースに保存
  if (coords) {
    console.log('\n💾 データベースに保存中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        latitude: coords.latitude,
        longitude: coords.longitude,
      })
      .eq('id', property.id);
    
    if (updateError) {
      console.log(`❌ 保存エラー:`, updateError.message);
    } else {
      console.log(`✅ データベースに保存しました`);
      console.log(`\n🗺️ AA10424は地図に表示されるようになりました！`);
      console.log(`座標: (${coords.latitude}, ${coords.longitude})`);
    }
  } else {
    console.log('\n❌ 座標を取得できませんでした');
  }
}

backfillAA10424();
