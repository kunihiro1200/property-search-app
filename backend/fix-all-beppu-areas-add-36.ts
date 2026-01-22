import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAllBeppuAreasAdd36() {
  console.log('=== 別府市全エリアに㊶を追加 ===\n');

  // 1. 全てのマッピングを取得
  const { data: allMappings, error: fetchError } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .order('school_district', { ascending: true })
    .order('region_name', { ascending: true });

  if (fetchError) {
    console.error('マッピング取得エラー:', fetchError);
    return;
  }

  console.log(`総マッピング数: ${allMappings.length}\n`);

  // 2. ㊶が欠けている地域を特定
  const needsUpdate = allMappings.filter(mapping => {
    const areas = mapping.distribution_areas;
    return !areas.includes('㊶');
  });

  console.log(`㊶が欠けている地域数: ${needsUpdate.length}\n`);

  if (needsUpdate.length === 0) {
    console.log('✓ 全ての地域に㊶が既に設定されています');
    return;
  }

  // 3. 更新対象を表示
  console.log('=== 更新対象 ===');
  needsUpdate.forEach(mapping => {
    console.log(`${mapping.school_district} - ${mapping.region_name}: ${mapping.distribution_areas} → ${mapping.distribution_areas}㊶`);
  });
  console.log('');

  // 4. 一括更新
  console.log('更新を開始します...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const mapping of needsUpdate) {
    const newAreas = mapping.distribution_areas + '㊶';
    
    const { error: updateError } = await supabase
      .from('beppu_area_mapping')
      .update({ distribution_areas: newAreas })
      .eq('id', mapping.id);

    if (updateError) {
      console.error(`✗ ${mapping.region_name} の更新に失敗:`, updateError);
      errorCount++;
    } else {
      console.log(`✓ ${mapping.region_name}: ${mapping.distribution_areas} → ${newAreas}`);
      successCount++;
    }
  }

  console.log('');
  console.log('=== 更新完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${errorCount}件`);

  // 5. 別府市の全物件の配信エリアを再計算する必要があることを通知
  console.log('');
  console.log('⚠️  次のステップ:');
  console.log('別府市の全物件の配信エリアを再計算する必要があります。');
  console.log('recalculate-beppu-areas-after-mapping-change.ts を実行してください。');
}

fixAllBeppuAreasAdd36().catch(console.error);
