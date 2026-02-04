import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function updateAA13500Coordinates() {
  console.log('🗺️ AA13500の座標を手動で更新...\n');

  // 大分市星和台2丁目2の18の9の座標（Google Mapsで確認）
  const latitude = 33.2382;
  const longitude = 131.6126;

  const { data, error } = await supabase
    .from('sellers')
    .update({ latitude, longitude })
    .eq('seller_number', 'AA13500')
    .select();

  if (error) {
    console.error('❌ 更新失敗:', error.message);
    return;
  }

  console.log('✅ 座標更新成功:');
  console.log('  売主番号: AA13500');
  console.log('  緯度:', latitude);
  console.log('  経度:', longitude);
  console.log('');
  console.log('📍 ブラウザで通話モードページを開いて、地図が表示されることを確認してください。');
}

updateAA13500Coordinates();
