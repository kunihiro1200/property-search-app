// 座標がない全公開前物件に座標を一括追加するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// .env.localを読み込む
dotenv.config({ path: 'backend/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Google MapのURLから座標を抽出
 */
async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    // 短縮URL（goo.gl）の場合、リダイレクト先を取得
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('  🔗 Detected shortened URL, fetching redirect...');
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow'
        });
        
        const redirectedUrl = response.url;
        console.log('  🔗 Redirected URL:', redirectedUrl);
        url = redirectedUrl;
      } catch (error) {
        console.warn('  ⚠️ Failed to fetch redirect URL:', error);
      }
    }
    
    // パターン1: ?q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }
    
    // パターン2: /place/lat,lng
    const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }
    
    // パターン3: /@lat,lng,zoom
    const atMatch = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }
    
    // パターン4: /search/lat,+lng または /search/lat,lng
    const searchMatch = url.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (searchMatch) {
      return {
        lat: parseFloat(searchMatch[1]),
        lng: parseFloat(searchMatch[2]),
      };
    }
    
    console.warn('  ⚠️ Could not extract coordinates from Google Map URL:', url);
    return null;
  } catch (error) {
    console.error('  ❌ Error extracting coordinates from URL:', error);
    return null;
  }
}

async function addAllMissingCoordinates() {
  console.log('🔍 Adding coordinates for all pre-publish properties without coordinates...\n');
  
  try {
    // 1. 公開前物件で座標がないものを取得
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, google_map_url, address, atbb_status, latitude, longitude')
      .or('atbb_status.eq.一般・公開前,atbb_status.eq.専任・公開前')
      .is('latitude', null)
      .order('property_number', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ All pre-publish properties already have coordinates!');
      return;
    }
    
    console.log(`✅ Found ${properties.length} properties without coordinates\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 2. 各物件の座標を追加
    for (const property of properties) {
      console.log(`📍 Processing ${property.property_number}...`);
      console.log(`  atbb_status: ${property.atbb_status}`);
      console.log(`  address: ${property.address}`);
      console.log(`  google_map_url: ${property.google_map_url}`);
      
      // Google Map URLがない場合はスキップ
      if (!property.google_map_url) {
        console.log(`  ⚠️ No google_map_url, skipping\n`);
        failCount++;
        continue;
      }
      
      // Google Map URLから座標を抽出
      const coordinates = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
      
      if (!coordinates) {
        console.log(`  ❌ Failed to extract coordinates\n`);
        failCount++;
        continue;
      }
      
      console.log(`  ✅ Extracted coordinates: (${coordinates.lat}, ${coordinates.lng})`);
      
      // データベースに保存
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          updated_at: new Date().toISOString()
        })
        .eq('property_number', property.property_number);
      
      if (updateError) {
        console.error(`  ❌ Error updating property:`, updateError);
        failCount++;
      } else {
        console.log(`  ✅ Successfully added coordinates to ${property.property_number}\n`);
        successCount++;
      }
      
      // APIレート制限を避けるため、少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. サマリーを表示
    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully added: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📍 Total processed: ${properties.length}`);
    
    if (successCount > 0) {
      console.log('\n💡 Next steps:');
      console.log('  1. Hard reload the browser (Ctrl+Shift+R)');
      console.log('  2. Click the map button');
      console.log('  3. Verify that pre-publish properties are displayed with orange markers');
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

addAllMissingCoordinates();
