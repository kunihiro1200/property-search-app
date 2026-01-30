/**
 * AA13407の座標を修正するスクリプト
 * Google Map URLから座標を抽出してデータベースに保存
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
 */
async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    let finalUrl = url;
    
    // 短縮URLの場合、リダイレクト先を取得
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('🔗 短縮URLを展開中...');
      try {
        const response = await axios.get(url, {
          maxRedirects: 5,
          validateStatus: () => true,
        });
        finalUrl = response.request.res.responseUrl || url;
        console.log('🔗 展開後URL:', finalUrl);
      } catch (error) {
        console.warn('⚠️ URL展開に失敗:', error);
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
    
    console.warn('⚠️ URLから座標を抽出できませんでした:', finalUrl);
    return null;
  } catch (error) {
    console.error('❌ 座標抽出エラー:', error);
    return null;
  }
}

async function fixAA13407Coordinates() {
  console.log('🔧 AA13407の座標を修正します...\n');
  
  // 1. 現在の状態を確認
  const { data: property, error: fetchError } = await supabase
    .from('property_listings')
    .select('id, property_number, address, google_map_url, latitude, longitude')
    .eq('property_number', 'AA13407')
    .single();
  
  if (fetchError) {
    console.error('❌ 物件取得エラー:', fetchError.message);
    return;
  }
  
  console.log('📋 現在の状態:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  Google Map URL:', property.google_map_url);
  console.log('  緯度:', property.latitude || 'NOT SET');
  console.log('  経度:', property.longitude || 'NOT SET');
  console.log('');
  
  // 2. Google Map URLから座標を抽出
  if (!property.google_map_url) {
    console.error('❌ Google Map URLが設定されていません');
    return;
  }
  
  const coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
  
  if (!coords) {
    console.error('❌ 座標を抽出できませんでした');
    return;
  }
  
  console.log('✅ 抽出した座標:');
  console.log('  緯度:', coords.lat);
  console.log('  経度:', coords.lng);
  console.log('');
  
  // 3. データベースを更新
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      latitude: coords.lat,
      longitude: coords.lng,
    })
    .eq('property_number', 'AA13407');
  
  if (updateError) {
    console.error('❌ 更新エラー:', updateError.message);
    return;
  }
  
  console.log('✅ AA13407の座標を更新しました！');
  console.log('');
  
  // 4. 更新後の状態を確認
  const { data: updated } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude')
    .eq('property_number', 'AA13407')
    .single();
  
  console.log('📋 更新後の状態:');
  console.log('  緯度:', updated?.latitude);
  console.log('  経度:', updated?.longitude);
}

fixAA13407Coordinates().catch(console.error);
