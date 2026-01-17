import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';

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

async function fixMissingDistributionAreas() {
  console.log('=== 配信エリアが未設定の物件を修正 ===\n');

  // 1. 配信エリアが未設定の物件を取得
  const { data: properties, error: fetchError } = await supabase
    .from('property_listings')
    .select('id, property_number, address, google_map_url, distribution_areas')
    .or('distribution_areas.is.null,distribution_areas.eq.')
    .order('property_number');

  if (fetchError) {
    console.error('物件取得エラー:', fetchError);
    return;
  }

  console.log(`配信エリア未設定の物件: ${properties?.length || 0}件\n`);

  if (!properties || properties.length === 0) {
    console.log('✅ 全ての物件に配信エリアが設定されています');
    return;
  }

  // 2. 各物件の配信エリアを計算して更新
  const calculator = new PropertyDistributionAreaCalculator();
  const beppuService = new BeppuAreaMappingService();
  
  let successCount = 0;
  let errorCount = 0;
  let noUrlCount = 0;
  let noMappingCount = 0;

  for (const property of properties) {
    try {
      console.log(`\n処理中: ${property.property_number}`);
      console.log(`  住所: ${property.address}`);

      if (!property.google_map_url && !property.address) {
        console.log(`  ⚠️ Google Map URLと住所の両方がありません - スキップ`);
        noUrlCount++;
        continue;
      }

      let distributionAreas: string | null = null;

      // 別府市の場合はBeppuAreaMappingServiceを使用
      if (property.address && property.address.includes('別府市')) {
        distributionAreas = await beppuService.getDistributionAreasForAddress(property.address);
        
        if (distributionAreas) {
          console.log(`  ✓ 別府市マッピング: ${distributionAreas}`);
        } else {
          console.log(`  ⚠️ 別府市マッピングが見つかりません`);
          noMappingCount++;
          continue;
        }
      } else {
        // その他の市はPropertyDistributionAreaCalculatorを使用
        const city = extractCityFromAddress(property.address);
        const result = await calculator.calculateDistributionAreas(
          property.google_map_url,
          city,
          property.address
        );

        if (result.formatted) {
          distributionAreas = result.formatted;
          console.log(`  ✓ 計算結果: ${distributionAreas}`);
          console.log(`    半径マッチ: [${result.radiusAreas.join(', ')}]`);
          console.log(`    市全域マッチ: [${result.cityWideAreas.join(', ')}]`);
        } else {
          console.log(`  ⚠️ 配信エリアを計算できませんでした`);
          noMappingCount++;
          continue;
        }
      }

      // DBを更新
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({ distribution_areas: distributionAreas })
        .eq('id', property.id);

      if (updateError) {
        console.log(`  ✗ 更新エラー:`, updateError);
        errorCount++;
      } else {
        console.log(`  ✓ 更新成功: ${distributionAreas}`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`  ✗ 処理エラー:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== 修正完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`URL/住所なし: ${noUrlCount}件`);
  console.log(`マッピングなし: ${noMappingCount}件`);
  console.log(`エラー: ${errorCount}件`);
  console.log(`合計: ${properties.length}件`);
}

fixMissingDistributionAreas()
  .then(() => {
    console.log('\n処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
