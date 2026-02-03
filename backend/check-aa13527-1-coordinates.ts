// AA13527-1の座標データを確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env.localを読み込む
dotenv.config({ path: 'backend/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCoordinates() {
  console.log('🔍 Checking coordinates for AA13527-1...\n');
  
  try {
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude, address, google_map_url, atbb_status')
      .eq('property_number', 'AA13527-1')
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ AA13527-1 not found in database');
      return;
    }
    
    console.log('✅ Found AA13527-1:');
    console.log('  property_number:', data.property_number);
    console.log('  atbb_status:', data.atbb_status);
    console.log('  latitude:', data.latitude);
    console.log('  longitude:', data.longitude);
    console.log('  address:', data.address);
    console.log('  google_map_url:', data.google_map_url);
    console.log('');
    
    if (data.latitude && data.longitude) {
      console.log('✅ AA13527-1 has coordinates');
      console.log('  → Should be included in map view');
    } else {
      console.log('❌ AA13527-1 does NOT have coordinates');
      console.log('  → Will be excluded from map view (withCoordinates=true)');
      console.log('');
      console.log('💡 Solution:');
      console.log('  1. Add coordinates to database');
      console.log('  2. Or remove withCoordinates=true filter from fetchAllProperties');
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkCoordinates();
