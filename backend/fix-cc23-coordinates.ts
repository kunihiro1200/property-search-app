import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function getCoordinatesFromUrl(googleMapUrl: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Google Map URLから座標を抽出
    // 例: https://www.google.com/maps/place/33.2382,131.6126
    const coordMatch = googleMapUrl.match(/[@\/](-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }
    
    // 短縮URLの場合は展開
    if (googleMapUrl.includes('share.google') || googleMapUrl.includes('goo.gl')) {
      console.log('短縮URLを展開中...');
      const response = await axios.get(googleMapUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 301
      });
      
      const location = response.headers.location;
      if (location) {
        const coordMatch = location.match(/[@\/](-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
          return {
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2])
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('座標抽出エラー:', error);
    return null;
  }
}

async function fixCC23Coordinates() {
  console.log('=== CC23座標データ修正 ===\n');
  
  try {
    // CC23を取得
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, google_map_url, address')
      .eq('property_number', 'CC23')
      .single();
    
    if (fetchError || !property) {
      console.error('❌ CC23が見つかりません:', fetchError);
      return;
    }
    
    console.log('物件番号:', property.property_number);
    console.log('住所:', property.address);
    console.log('Google Map URL:', property.google_map_url);
    
    // Google Map URLから座標を取得
    let coordinates = null;
    if (property.google_map_url) {
      coordinates = await getCoordinatesFromUrl(property.google_map_url);
    }
    
    // 座標が取得できない場合は、住所からジオコーディング
    if (!coordinates && property.address) {
      console.log('\n住所からジオコーディング中...');
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(property.address)}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(geocodeUrl);
        
        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          coordinates = {
            lat: location.lat,
            lng: location.lng
          };
          console.log('✅ ジオコーディング成功');
        }
      } catch (error) {
        console.error('❌ ジオコーディングエラー:', error);
      }
    }
    
    if (!coordinates) {
      console.log('\n❌ 座標を取得できませんでした');
      return;
    }
    
    console.log(`\n✅ 座標取得成功: (${coordinates.lat}, ${coordinates.lng})`);
    
    // データベースを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        latitude: coordinates.lat,
        longitude: coordinates.lng
      })
      .eq('id', property.id);
    
    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }
    
    console.log('✅ データベース更新完了');
    
    // 確認
    const { data: updated } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude')
      .eq('id', property.id)
      .single();
    
    console.log('\n=== 更新後のデータ ===');
    console.log('物件番号:', updated?.property_number);
    console.log('緯度:', updated?.latitude);
    console.log('経度:', updated?.longitude);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

fixCC23Coordinates();
