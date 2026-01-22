import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function extractCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  
  const cityMatch = address.match(/([^\s]+?[都道府県])?([^\s]+?[市区町村])/);
  if (cityMatch) {
    return cityMatch[2] || cityMatch[0];
  }
  
  return null;
}

async function fixAA12449() {
  console.log('=== AA12449の配信エリアを修正 ===\n');

  // 1. 物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('id, property_number, address, google_map_url, distribution_areas')
    .eq('property_number', 'AA12449')
    .single();

  if (error || !property) {
    console.error('物件が見つかりません:', error);
    return;
  }

  console.log('物件情報:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  現在の配信エリア: ${property.distribution_areas || '(未設定)'}`);
  console.log('');

  // 2. 配信エリアを計算
  const calculator = new PropertyDistributionAreaCalculator();
  const city = extractCityFromAddress(property.address);
  
  console.log(`市名: ${city}`);
  
  const result = await calculator.calculateDistributionAreas(
    property.google_map_url,
    city,
    property.address
  );

  console.log('\n計算結果:');
  console.log(`  エリア配列: [${result.areas.join(', ')}]`);
  console.log(`  フォーマット済み: ${result.formatted}`);
  console.log(`  半径マッチ: [${result.radiusAreas.join(', ')}]`);
  console.log(`  市全域マッチ: [${result.cityWideAreas.join(', ')}]`);

  // 3. DBを更新
  if (result.formatted) {
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ distribution_areas: result.formatted })
      .eq('id', property.id);

    if (updateError) {
      console.error('\n✗ 更新エラー:', updateError);
    } else {
      console.log(`\n✅ 更新成功: ${property.distribution_areas || '(未設定)'} → ${result.formatted}`);
    }
  } else {
    console.log('\n❌ 配信エリアを計算できませんでした');
  }

  // 4. 更新後の確認
  const { data: updated } = await supabase
    .from('property_listings')
    .select('distribution_areas')
    .eq('property_number', 'AA12449')
    .single();

  console.log('\n更新後の確認:');
  console.log(`  配信エリア: ${updated?.distribution_areas || '(未設定)'}`);
}

fixAA12449()
  .then(() => {
    console.log('\n処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
