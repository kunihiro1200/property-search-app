import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

interface Seller {
  id: string;
  seller_number: string;
  property_address: string | null;
  latitude: number | null;
  longitude: number | null;
}

async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn(`⚠️ Geocoding失敗: ${address} (${response.data.status})`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Geocodingエラー: ${address}`, error);
    return null;
  }
}

async function backfillCoordinates() {
  console.log('🗺️ 全売主の座標を一括取得します\n');
  
  // 座標が未登録の売主を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, property_address, latitude, longitude')
    .is('deleted_at', null)
    .order('seller_number', { ascending: true });
  
  if (error) {
    console.error('❌ 売主取得エラー:', error);
    return;
  }
  
  if (!sellers || sellers.length === 0) {
    console.log('📊 売主が見つかりませんでした');
    return;
  }
  
  console.log(`📊 全売主数: ${sellers.length}件\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const seller of sellers as Seller[]) {
    // 物件住所がない場合はスキップ
    if (!seller.property_address) {
      console.log(`⏭️ ${seller.seller_number}: 物件住所なし`);
      skipCount++;
      continue;
    }
    
    // 既に座標が登録されている場合はスキップ
    if (seller.latitude && seller.longitude) {
      console.log(`⏭️ ${seller.seller_number}: 座標登録済み`);
      skipCount++;
      continue;
    }
    
    // Geocoding APIで座標を取得
    const coordinates = await getCoordinatesFromAddress(seller.property_address);
    
    if (coordinates) {
      // データベースに座標を保存
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        })
        .eq('id', seller.id);
      
      if (updateError) {
        console.error(`❌ ${seller.seller_number}: 座標保存失敗`, updateError);
        errorCount++;
      } else {
        console.log(`✅ ${seller.seller_number}: 座標登録成功 (${coordinates.lat}, ${coordinates.lng})`);
        successCount++;
      }
    } else {
      errorCount++;
    }
    
    // APIクォータ対策: 100msの待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 結果:`);
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`⏭️ スキップ: ${skipCount}件`);
  console.log(`❌ 失敗: ${errorCount}件`);
}

backfillCoordinates();
