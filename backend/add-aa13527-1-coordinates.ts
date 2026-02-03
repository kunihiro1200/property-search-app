// AA13527-1の座標データを追加するスクリプト
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
      console.log('🔗 Detected shortened URL, fetching redirect...');
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow'
        });
        
        const redirectedUrl = response.url;
        console.log('🔗 Redirected URL:', redirectedUrl);
        url = redirectedUrl;
      } catch (error) {
        console.warn('⚠️ Failed to fetch redirect URL:', error);
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
    
    console.warn('⚠️ Could not extract coordinates from Google Map URL:', url);
    return null;
  } catch (error) {
    console.error('❌ Error extracting coordinates from URL:', error);
    return null;
  }
}

async function addCoordinates() {
  console.log('🔍 Adding coordinates for AA13527-1...\n');
  
  try {
    // 1. AA13527-1のデータを取得
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, google_map_url, address')
      .eq('property_number', 'AA13527-1')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching property:', fetchError);
      return;
    }
    
    if (!property) {
      console.log('❌ AA13527-1 not found in database');
      return;
    }
    
    console.log('✅ Found AA13527-1:');
    console.log('  google_map_url:', property.google_map_url);
    console.log('  address:', property.address);
    console.log('');
    
    // 2. Google Map URLから座標を抽出
    if (!property.google_map_url) {
      console.log('❌ No google_map_url found');
      return;
    }
    
    const coordinates = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
    
    if (!coordinates) {
      console.log('❌ Failed to extract coordinates from Google Map URL');
      return;
    }
    
    console.log('✅ Extracted coordinates:');
    console.log('  latitude:', coordinates.lat);
    console.log('  longitude:', coordinates.lng);
    console.log('');
    
    // 3. データベースに保存
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'AA13527-1');
    
    if (updateError) {
      console.error('❌ Error updating property:', updateError);
      return;
    }
    
    console.log('✅ Successfully added coordinates to AA13527-1');
    console.log('  → AA13527-1 will now be included in map view');
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

addCoordinates();
