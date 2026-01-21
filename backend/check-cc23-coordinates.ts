import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC23Coordinates() {
  console.log('=== CC23座標データ確認 ===\n');
  
  try {
    // property_listingsからCC23を取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude, google_map_url')
      .eq('property_number', 'CC23')
      .single();
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    if (!property) {
      console.log('❌ CC23が見つかりません');
      return;
    }
    
    console.log('✅ CC23データ:');
    console.log('物件番号:', property.property_number);
    console.log('緯度 (latitude):', property.latitude);
    console.log('経度 (longitude):', property.longitude);
    console.log('Google Map URL:', property.google_map_url);
    
    // 座標の有無を確認
    if (property.latitude && property.longitude) {
      console.log('\n✅ 座標データあり');
      console.log(`座標: (${property.latitude}, ${property.longitude})`);
    } else {
      console.log('\n❌ 座標データなし');
      if (!property.latitude) console.log('  - latitudeが空');
      if (!property.longitude) console.log('  - longitudeが空');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkCC23Coordinates();
