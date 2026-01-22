import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA13129DistributionAreas() {
  console.log('=== AA13129の配信エリア修正 ===\n');

  // 1. 現在のデータを確認
  console.log('1. 現在のAA13129データ:');
  const { data: before, error: beforeError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA13129')
    .single();

  if (beforeError) {
    console.error('エラー:', beforeError);
    return;
  }

  console.log('  物件番号:', before.property_number);
  console.log('  住所:', before.address);
  console.log('  現在の配信エリア:', before.distribution_areas);
  console.log('');

  // 2. 配信エリアを㊵のみに修正
  console.log('2. 配信エリアを㊵のみに修正:');
  const { data: updated, error: updateError } = await supabase
    .from('property_listings')
    .update({
      distribution_areas: '["㊵"]'
    })
    .eq('property_number', 'AA13129')
    .select()
    .single();

  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }

  console.log('  ✓ 更新成功');
  console.log('  新しい配信エリア:', updated.distribution_areas);
  console.log('');

  // 3. 確認
  console.log('3. 更新後の確認:');
  const { data: after, error: afterError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA13129')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('  物件番号:', after.property_number);
  console.log('  住所:', after.address);
  console.log('  配信エリア:', after.distribution_areas);
  console.log('');
  console.log('✓ 修正完了');
}

fixAA13129DistributionAreas().catch(console.error);
