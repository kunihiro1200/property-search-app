import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA13149DistributionAreas() {
  console.log('=== AA13149 配信エリア修正 ===\n');

  // 1. 現在の物件情報を確認
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13149')
    .single();

  if (propError || !property) {
    console.log('❌ 物件が見つかりません:', propError?.message);
    return;
  }

  console.log('📍 現在の物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  配信エリア（修正前）:', property.distribution_areas);
  console.log('');

  // 2. 住所から市区町村を抽出
  const address = property.address || '';
  let city = '';
  
  // 別府市北中7-1 → 別府市
  const cityMatch = address.match(/([^\s]+?[都道府県])?([^\s]+?[市区町村])/);
  if (cityMatch) {
    city = cityMatch[2] || cityMatch[0];
  }

  console.log('  抽出された市区町村:', city);

  // 3. 市区町村からエリア番号を取得
  const { data: areaConfig, error: areaError } = await supabase
    .from('area_map_config')
    .select('*')
    .eq('city_name', city)
    .single();

  if (areaError || !areaConfig) {
    console.log('❌ エリア設定が見つかりません:', city);
    console.log('   手動で配信エリアを設定する必要があります');
    return;
  }

  console.log('  エリア番号:', areaConfig.area_number);
  console.log('  エリア名:', areaConfig.area_name);
  console.log('');

  // 4. distribution_areasを更新
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      distribution_areas: areaConfig.area_number
    })
    .eq('property_number', 'AA13149');

  if (updateError) {
    console.log('❌ 更新エラー:', updateError.message);
    return;
  }

  console.log('✅ 配信エリアを更新しました！');
  console.log(`   ${property.property_number}: distribution_areas = "${areaConfig.area_number}"`);
  console.log('');

  // 5. 更新後の確認
  const { data: updated } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA13149')
    .single();

  console.log('📍 更新後の物件情報:');
  console.log('  物件番号:', updated?.property_number);
  console.log('  住所:', updated?.address);
  console.log('  配信エリア:', updated?.distribution_areas);
  console.log('');
  console.log('✅ これで配信メールボタンが正常に動作するはずです！');
}

fixAA13149DistributionAreas().catch(console.error);
