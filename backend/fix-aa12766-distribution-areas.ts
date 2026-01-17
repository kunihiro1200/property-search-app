import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA12766() {
  console.log('=== Fixing AA12766 Distribution Areas ===\n');

  // 現在のデータを確認
  const { data: listing } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA12766')
    .single();

  if (!listing) {
    console.log('AA12766が見つかりません');
    return;
  }

  console.log('現在のデータ:');
  console.log(`  物件番号: ${listing.property_number}`);
  console.log(`  住所: ${listing.address}`);
  console.log(`  現在の配信エリア: ${listing.distribution_areas}`);
  console.log();

  // 石垣東のマッピングを確認
  const { data: mapping } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .eq('region_name', '石垣東')
    .single();

  if (!mapping) {
    console.log('石垣東のマッピングが見つかりません');
    return;
  }

  console.log('石垣東のマッピング:');
  console.log(`  学校区: ${mapping.school_district}`);
  console.log(`  配信エリア: ${mapping.distribution_areas}`);
  console.log(`  その他: ${mapping.other_region || 'なし'}`);
  console.log();

  // 配信エリアを更新
  const correctAreas = mapping.distribution_areas;
  console.log(`正しい配信エリア: ${correctAreas}`);
  console.log();

  const { error } = await supabase
    .from('property_listings')
    .update({ distribution_areas: correctAreas })
    .eq('property_number', 'AA12766');

  if (error) {
    console.error('更新エラー:', error);
    return;
  }

  console.log('✓ 配信エリアを更新しました');

  // 更新後のデータを確認
  const { data: updated } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA12766')
    .single();

  console.log('\n更新後のデータ:');
  console.log(`  物件番号: ${updated?.property_number}`);
  console.log(`  住所: ${updated?.address}`);
  console.log(`  配信エリア: ${updated?.distribution_areas}`);
}

fixAA12766().catch(console.error);
