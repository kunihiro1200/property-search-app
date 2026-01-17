import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addBeppuCityWideMapping() {
  console.log('別府市全体（㊶）のマッピングを追加します...\n');

  // 1. 現在のマッピングを確認
  const { data: existingMappings, error: fetchError } = await supabase
    .from('beppu_area_mapping')
    .select('id, region_name, distribution_areas')
    .order('region_name');

  if (fetchError) {
    console.error('既存マッピングの取得エラー:', fetchError);
    return;
  }

  console.log(`現在のマッピング数: ${existingMappings?.length || 0}\n`);

  // 2. 各地域に㊶を追加
  let updatedCount = 0;
  let alreadyHasCount = 0;
  let errorCount = 0;

  for (const mapping of existingMappings || []) {
    const currentAreas = mapping.distribution_areas || '';
    
    // すでに㊶が含まれているかチェック
    if (currentAreas.includes('㊶')) {
      alreadyHasCount++;
      console.log(`✓ ${mapping.region_name}: すでに㊶を含んでいます (${currentAreas})`);
      continue;
    }

    // ㊶を追加
    const updatedAreas = currentAreas ? `${currentAreas}㊶` : '㊶';

    const { error: updateError } = await supabase
      .from('beppu_area_mapping')
      .update({ distribution_areas: updatedAreas })
      .eq('id', mapping.id);

    if (updateError) {
      console.error(`✗ ${mapping.region_name}: 更新エラー`, updateError);
      errorCount++;
    } else {
      updatedCount++;
      console.log(`✓ ${mapping.region_name}: ${currentAreas} → ${updatedAreas}`);
    }
  }

  console.log('\n=== 更新完了 ===');
  console.log(`更新した地域: ${updatedCount}`);
  console.log(`すでに㊶を含んでいた地域: ${alreadyHasCount}`);
  console.log(`エラー: ${errorCount}`);
  console.log(`合計: ${existingMappings?.length || 0}`);

  // 3. 更新後の確認
  console.log('\n=== 更新後の確認 ===');
  const { data: afterMappings, error: afterError } = await supabase
    .from('beppu_area_mapping')
    .select('region_name, distribution_areas')
    .order('region_name');

  if (afterError) {
    console.error('確認エラー:', afterError);
    return;
  }

  const withArea36 = afterMappings?.filter(m => m.distribution_areas?.includes('㊶')) || [];
  const withoutArea36 = afterMappings?.filter(m => !m.distribution_areas?.includes('㊶')) || [];

  console.log(`㊶を含む地域: ${withArea36.length}`);
  console.log(`㊶を含まない地域: ${withoutArea36.length}`);

  if (withoutArea36.length > 0) {
    console.log('\n㊶を含まない地域:');
    withoutArea36.forEach(m => {
      console.log(`  - ${m.region_name}: ${m.distribution_areas}`);
    });
  }
}

addBeppuCityWideMapping()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
