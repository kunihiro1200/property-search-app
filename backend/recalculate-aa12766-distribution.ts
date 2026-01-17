import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function recalculateAA12766() {
  console.log('=== Recalculating AA12766 Distribution Areas ===\n');

  // 物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, distribution_areas')
    .eq('property_number', 'AA12766')
    .single();

  if (error || !property) {
    console.error('物件が見つかりません:', error);
    return;
  }

  console.log('現在のデータ:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  Google Map URL: ${property.google_map_url || 'なし'}`);
  console.log(`  現在の配信エリア: ${property.distribution_areas || 'なし'}`);
  console.log();

  // 市名を抽出
  const city = property.address?.includes('大分') ? '大分市' : 
               property.address?.includes('別府') ? '別府市' : null;

  console.log(`抽出された市名: ${city}`);
  console.log();

  // 配信エリアを再計算
  const calculator = new PropertyDistributionAreaCalculator();
  const result = await calculator.calculateDistributionAreas(
    property.google_map_url,
    city,
    property.address
  );

  console.log('計算結果:');
  console.log(`  配信エリア: ${result.formatted}`);
  console.log(`  エリアリスト: ${result.areas.join(', ')}`);
  console.log(`  半径ベース: ${result.radiusAreas.join(', ') || 'なし'}`);
  console.log(`  市全域ベース: ${result.cityWideAreas.join(', ') || 'なし'}`);
  console.log();

  // データベースを更新
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ distribution_areas: result.formatted })
    .eq('property_number', 'AA12766');

  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }

  console.log('✓ 配信エリアを更新しました');

  // 更新後のデータを確認
  const { data: updated } = await supabase
    .from('property_listings')
    .select('property_number, distribution_areas')
    .eq('property_number', 'AA12766')
    .single();

  console.log('\n更新後のデータ:');
  console.log(`  物件番号: ${updated?.property_number}`);
  console.log(`  配信エリア: ${updated?.distribution_areas}`);
}

recalculateAA12766().catch(console.error);
