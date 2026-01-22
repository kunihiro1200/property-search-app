// AA10424の座標をデータベースに保存するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function updateAA10424Coordinates() {
  try {
    console.log('🔄 AA10424の座標を更新中...');
    
    // Google Map URLから取得した座標
    const latitude = 33.281754;
    const longitude = 131.487344;
    
    // IDで更新
    const { data, error } = await supabase
      .from('property_listings')
      .update({
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', '28b4784d-fd54-43fe-bfbc-ddd06d8142d1')
      .select();
    
    if (error) {
      console.error('❌ 更新エラー:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ レコードが見つかりません');
      return;
    }
    
    console.log('✅ 座標を更新しました:');
    console.log('  物件番号:', data[0].property_number);
    console.log('  緯度:', data[0].latitude);
    console.log('  経度:', data[0].longitude);
    
    // 確認
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude')
      .eq('id', '28b4784d-fd54-43fe-bfbc-ddd06d8142d1')
      .single();
    
    if (checkError) {
      console.error('❌ 確認エラー:', checkError);
      return;
    }
    
    console.log('\n📊 確認結果:');
    console.log('  物件番号:', checkData.property_number);
    console.log('  緯度:', checkData.latitude);
    console.log('  経度:', checkData.longitude);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

updateAA10424Coordinates();
