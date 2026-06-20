import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPropertyCoordinates() {
  console.log('🔍 Testing property coordinates...\n');
  
  try {
    // 最近の物件を10件取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, address, latitude, longitude, google_map_url')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found');
      return;
    }
    
    console.log(`✅ Found ${properties.length} properties\n`);
    
    // 各物件の座標情報を確認
    properties.forEach((property, index) => {
      console.log(`${index + 1}. ${property.property_number} - ${property.address}`);
      console.log(`   Latitude: ${property.latitude || 'NOT SET'}`);
      console.log(`   Longitude: ${property.longitude || 'NOT SET'}`);
      console.log(`   Google Map URL: ${property.google_map_url || 'NOT SET'}`);
      console.log('');
    });
    
    // 統計情報
    const withCoordinates = properties.filter(p => p.latitude && p.longitude).length;
    const withMapUrl = properties.filter(p => p.google_map_url).length;
    
    console.log('📊 Statistics:');
    console.log(`   Properties with coordinates: ${withCoordinates}/${properties.length} (${Math.round(withCoordinates / properties.length * 100)}%)`);
    console.log(`   Properties with Google Map URL: ${withMapUrl}/${properties.length} (${Math.round(withMapUrl / properties.length * 100)}%)`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testPropertyCoordinates();
