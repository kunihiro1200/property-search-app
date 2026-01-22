// エリアマップ設定のGoogle Maps URLから座標を抽出してDBを更新
import { createClient } from '@supabase/supabase-js';
import { EnhancedGeolocationService } from './src/services/EnhancedGeolocationService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function extractAndUpdateCoordinates() {
  console.log('=== エリアマップ設定の座標抽出と更新 ===\n');

  const geolocationService = new EnhancedGeolocationService();

  // すべてのエリア設定を取得
  const { data: areas, error } = await supabase
    .from('area_map_config')
    .select('*')
    .order('area_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`📍 ${areas?.length || 0}個のエリアを処理します\n`);

  for (const area of areas || []) {
    console.log(`処理中: ${area.area_number} (${area.area_name || 'エリア名なし'})`);

    if (!area.google_map_url) {
      console.log(`  ⚠️  Google Maps URLなし（市全域エリア）\n`);
      continue;
    }

    try {
      // URLから座標を抽出
      const coords = await geolocationService.extractCoordinatesFromUrl(area.google_map_url);

      if (coords) {
        console.log(`  ✅ 座標抽出成功: lat=${coords.lat}, lng=${coords.lng}`);

        // DBを更新
        const { error: updateError } = await supabase
          .from('area_map_config')
          .update({ coordinates: coords })
          .eq('area_number', area.area_number);

        if (updateError) {
          console.error(`  ❌ DB更新失敗:`, updateError.message);
        } else {
          console.log(`  ✅ DB更新成功`);
        }
      } else {
        console.log(`  ❌ 座標抽出失敗`);
      }
    } catch (error) {
      console.error(`  ❌ エラー:`, error);
    }

    console.log('');
  }

  // 更新結果を確認
  const { data: updatedAreas, error: verifyError } = await supabase
    .from('area_map_config')
    .select('*')
    .not('coordinates', 'is', null)
    .order('area_number');

  if (verifyError) {
    console.error('検証エラー:', verifyError);
  } else {
    console.log(`\n✅ 座標が設定されたエリア: ${updatedAreas?.length || 0}個`);
    updatedAreas?.forEach(area => {
      const coords = typeof area.coordinates === 'string' 
        ? JSON.parse(area.coordinates) 
        : area.coordinates;
      console.log(`  ${area.area_number}: lat=${coords.lat}, lng=${coords.lng}`);
    });
  }
}

extractAndUpdateCoordinates();
