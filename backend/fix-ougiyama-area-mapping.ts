import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixOugiyamaAreaMapping() {
  console.log('=== 扇山のエリアマッピング修正 ===\n');

  // 1. 現在のマッピングを確認
  const { data: currentMapping, error: fetchError } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .eq('region_name', '扇山')
    .single();

  if (fetchError) {
    console.error('現在のマッピング取得エラー:', fetchError);
    return;
  }

  console.log('現在のマッピング:');
  console.log('  地域名:', currentMapping.region_name);
  console.log('  学校区:', currentMapping.school_district);
  console.log('  配信エリア:', currentMapping.distribution_areas);
  console.log('');

  // 2. マッピングを更新
  console.log('マッピングを更新中...');
  const { data: updatedMapping, error: updateError } = await supabase
    .from('beppu_area_mapping')
    .update({
      distribution_areas: '⑨㊶'
    })
    .eq('region_name', '扇山')
    .select()
    .single();

  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }

  console.log('✓ マッピングを更新しました');
  console.log('  新しい配信エリア:', updatedMapping.distribution_areas);
  console.log('');

  // 3. AA11165の配信エリアを再計算
  console.log('=== AA11165の配信エリアを再計算 ===\n');

  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA11165')
    .single();

  if (propError) {
    console.error('物件取得エラー:', propError);
    return;
  }

  console.log('物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  現在の配信エリア:', property.distribution_areas);
  console.log('');

  // 4. 配信エリアを手動で更新（扇山は⑨㊶）
  console.log('配信エリアを更新中...');
  const { data: updatedProperty, error: propUpdateError } = await supabase
    .from('property_listings')
    .update({
      distribution_areas: '⑨㊶'
    })
    .eq('property_number', 'AA11165')
    .select()
    .single();

  if (propUpdateError) {
    console.error('物件更新エラー:', propUpdateError);
    return;
  }

  console.log('✓ 物件の配信エリアを更新しました');
  console.log('  新しい配信エリア:', updatedProperty.distribution_areas);
  console.log('');

  console.log('=== 完了 ===');
  console.log('扇山のマッピングを「⑨」から「⑨㊶」に更新しました');
  console.log('AA11165の配信エリアを「⑨㊶」に更新しました');
}

fixOugiyamaAreaMapping().catch(console.error);
