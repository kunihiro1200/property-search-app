/**
 * 座標が未設定の物件を一括で修正するスクリプト
 * 
 * Google Map URLから座標を抽出してデータベースに保存します。
 * 地図検索機能には latitude と longitude が必須です。
 * 
 * 使用方法:
 *   npx ts-node backend/backfill-missing-coordinates.ts
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Google Map URLから座標を抽出
 * 
 * 対応パターン:
 * - /search/lat,lng または /search/lat,+lng
 * - @lat,lng,zoom
 * - /place/.../@lat,lng
 * - ?q=lat,lng
 * - !3dlat!4dlng（Google Mapsの新しいフォーマット）
 */
async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    let finalUrl = url;
    
    // 短縮URLの場合、リダイレクト先を取得
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const response = await axios.get(url, {
          maxRedirects: 5,
          validateStatus: () => true,
          timeout: 10000,
        });
        finalUrl = response.request?.res?.responseUrl || url;
      } catch (error) {
        console.warn(`  ⚠️ URL展開に失敗: ${url}`);
      }
    }
    
    // パターン1: /search/lat,lng または /search/lat,+lng
    const searchMatch = finalUrl.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (searchMatch) {
      return {
        lat: parseFloat(searchMatch[1]),
        lng: parseFloat(searchMatch[2]),
      };
    }
    
    // パターン2: @lat,lng,zoom
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }
    
    // パターン3: /place/.../@lat,lng
    const placeMatch = finalUrl.match(/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }
    
    // パターン4: ?q=lat,lng
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }
    
    // パターン5: !3dlat!4dlng（Google Mapsの新しいフォーマット）
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return {
        lat: parseFloat(dataMatch[1]),
        lng: parseFloat(dataMatch[2]),
      };
    }
    
    return null;
  } catch (error) {
    console.error(`  ❌ 座標抽出エラー: ${url}`);
    return null;
  }
}

async function backfillMissingCoordinates() {
  console.log('🔧 座標が未設定の物件を一括修正します...\n');
  
  // 1. 座標が未設定でGoogle Map URLがある物件を取得
  const { data: properties, error: fetchError } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .not('google_map_url', 'is', null)
    .not('google_map_url', 'eq', '');
  
  if (fetchError) {
    console.error('❌ 物件取得エラー:', fetchError.message);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('✅ 座標が未設定の物件はありません');
    return;
  }
  
  console.log(`📊 座標が未設定の物件: ${properties.length}件\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const property of properties) {
    console.log(`📝 処理中: ${property.property_number}`);
    console.log(`   URL: ${property.google_map_url}`);
    
    const coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
    
    if (!coords) {
      console.log(`   ❌ 座標抽出失敗\n`);
      failCount++;
      continue;
    }
    
    console.log(`   📍 抽出座標: (${coords.lat}, ${coords.lng})`);
    
    // データベースを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        latitude: coords.lat,
        longitude: coords.lng,
      })
      .eq('id', property.id);
    
    if (updateError) {
      console.log(`   ❌ 更新エラー: ${updateError.message}\n`);
      failCount++;
      continue;
    }
    
    console.log(`   ✅ 更新成功\n`);
    successCount++;
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 バックフィル完了:');
  console.log(`   ✅ 成功: ${successCount}件`);
  console.log(`   ❌ 失敗: ${failCount}件`);
  console.log('═══════════════════════════════════════════════════════════');
}

backfillMissingCoordinates().catch(console.error);
