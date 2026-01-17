import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function recalculateAllBeppuDistributionAreas() {
  console.log('別府市内の全物件の配信エリアを再計算します...\n');

  // 1. 別府市内の全物件を取得
  const { data: properties, error: fetchError } = await supabase
    .from('property_listings')
    .select('id, property_number, address')
    .ilike('address', '%別府市%')
    .order('property_number');

  if (fetchError) {
    console.error('物件取得エラー:', fetchError);
    return;
  }

  console.log(`対象物件数: ${properties?.length || 0}\n`);

  if (!properties || properties.length === 0) {
    console.log('対象物件がありません');
    return;
  }

  // 2. BeppuAreaMappingServiceを使用して配信エリアを再計算
  const beppuService = new BeppuAreaMappingService();
  let successCount = 0;
  let errorCount = 0;
  let unchangedCount = 0;
  let notFoundCount = 0;

  for (const property of properties) {
    try {
      // 住所から配信エリアを計算
      const distributionAreas = await beppuService.getDistributionAreasForAddress(property.address);

      if (!distributionAreas) {
        console.log(`⚠ ${property.property_number}: マッピングが見つかりません (${property.address})`);
        notFoundCount++;
        continue;
      }

      // 現在の配信エリアを取得
      const { data: currentProperty } = await supabase
        .from('property_listings')
        .select('distribution_areas')
        .eq('id', property.id)
        .single();

      const currentAreas = currentProperty?.distribution_areas || '';

      if (currentAreas === distributionAreas) {
        unchangedCount++;
        console.log(`= ${property.property_number}: 変更なし (${distributionAreas})`);
        continue;
      }

      // 配信エリアを更新
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({ distribution_areas: distributionAreas })
        .eq('id', property.id);

      if (updateError) {
        console.error(`✗ ${property.property_number}: 更新エラー`, updateError);
        errorCount++;
      } else {
        successCount++;
        console.log(`✓ ${property.property_number}: ${currentAreas} → ${distributionAreas}`);
      }
    } catch (error) {
      console.error(`✗ ${property.property_number}: 処理エラー`, error);
      errorCount++;
    }
  }

  console.log('\n=== 再計算完了 ===');
  console.log(`成功: ${successCount}`);
  console.log(`変更なし: ${unchangedCount}`);
  console.log(`マッピング未発見: ${notFoundCount}`);
  console.log(`エラー: ${errorCount}`);
  console.log(`合計: ${properties.length}`);
}

recalculateAllBeppuDistributionAreas()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
