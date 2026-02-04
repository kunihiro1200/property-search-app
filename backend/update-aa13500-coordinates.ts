import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

(async () => {
  // 大分市星和台2丁目2-18-9の正しい座標
  // Google Mapsで確認済み
  const latitude = 33.19138;  // 正確な緯度
  const longitude = 131.61937; // 正確な経度
  
  console.log('🗺️ AA13500の座標を更新します');
  console.log('物件住所: 大分市星和台2丁目2の18の9');
  console.log('新しい座標:', { lat: latitude, lng: longitude });
  
  const { data, error } = await supabase
    .from('sellers')
    .update({
      latitude: latitude,
      longitude: longitude,
    })
    .eq('seller_number', 'AA13500')
    .select();
  
  if (error) {
    console.error('❌ 更新失敗:', error);
  } else {
    console.log('✅ 座標を更新しました:', data);
  }
})();
