import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    // 短縮URLの場合、リダイレクト先を取得
    let finalUrl = url;
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('🔗 Resolving shortened URL...');
      const response = await axios.get(url, {
        maxRedirects: 5,
        validateStatus: () => true,
      });
      finalUrl = response.request.res.responseUrl || url;
      console.log('✅ Redirected to:', finalUrl);
    }
    
    // パターン1: /search/lat,lng
    let match = finalUrl.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    
    // パターン2: /@lat,lng,zoom
    match = finalUrl.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    
    // パターン3: /place/.../@lat,lng
    match = finalUrl.match(/\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error extracting coordinates:', error);
    return null;
  }
}

async function fixAA13436Coordinates() {
  console.log('🔧 Fixing AA13436 coordinates...\n');
  
  // ステップ1: 現在のデータを取得
  const { data: property, error: fetchError } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, latitude, longitude, address')
    .eq('property_number', 'AA13436')
    .single();
  
  if (fetchError) {
    console.error('❌ Error fetching property:', fetchError);
    return;
  }
  
  console.log('📊 Current data:');
  console.log(JSON.stringify(property, null, 2));
  
  // ステップ2: Google Map URLから座標を抽出
  if (!property.google_map_url) {
    console.error('❌ No Google Map URL found');
    return;
  }
  
  console.log('\n📍 Extracting coordinates from URL...');
  const coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
  
  if (!coords) {
    console.error('❌ Could not extract coordinates from URL');
    return;
  }
  
  console.log('✅ Extracted coordinates:', coords);
  
  // ステップ3: データベースを更新
  console.log('\n💾 Updating database...');
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      latitude: coords.lat,
      longitude: coords.lng,
    })
    .eq('property_number', 'AA13436');
  
  if (updateError) {
    console.error('❌ Error updating property:', updateError);
    return;
  }
  
  console.log('✅ Database updated successfully!');
  
  // ステップ4: 確認
  console.log('\n🔍 Verifying update...');
  const { data: updatedProperty } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude')
    .eq('property_number', 'AA13436')
    .single();
  
  console.log('✅ Updated data:');
  console.log(JSON.stringify(updatedProperty, null, 2));
}

fixAA13436Coordinates();
