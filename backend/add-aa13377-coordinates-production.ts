// 本番環境：AA13377の座標を手動で追加するスクリプト
// 住所: 大分市金池町1丁目10-22
// Google Mapで検索した結果: 33.2387, 131.6097
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env（本番環境）を読み込む
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addCoordinates() {
  console.log('🌐 PRODUCTION: Adding coordinates for AA13377...\n');
  
  try {
    // 1. AA13377のデータを確認
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, google_map_url, address, atbb_status')
      .eq('property_number', 'AA13377')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching property:', fetchError);
      return;
    }
    
    if (!property) {
      console.log('❌ AA13377 not found in database');
      return;
    }
    
    console.log('✅ Found AA13377:');
    console.log('  atbb_status:', property.atbb_status);
    console.log('  address:', property.address);
    console.log('  google_map_url:', property.google_map_url);
    console.log('');
    
    // 2. 住所から座標を手動で設定
    // 大分市金池町1丁目10-22 → Google Mapで検索した結果
    const coordinates = {
      lat: 33.2387,
      lng: 131.6097
    };
    
    console.log('✅ Using coordinates from address search:');
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
      .eq('property_number', 'AA13377');
    
    if (updateError) {
      console.error('❌ Error updating property:', updateError);
      return;
    }
    
    console.log('✅ Successfully added coordinates to AA13377');
    console.log('  → AA13377 will now be included in map view');
    console.log('');
    console.log('💡 Production environment updated!');
    console.log('  AA13377 will display with an orange marker on the map.');
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

addCoordinates();
