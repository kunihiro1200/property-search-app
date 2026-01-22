import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixIshigakiHigashiMapping() {
  console.log('=== 石垣東マッピング修正 ===\n');

  try {
    // 1. 現在の石垣東マッピングを確認
    console.log('【現在のマッピング】');
    const { data: currentMappings } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .ilike('region_name', '石垣東%')
      .order('region_name');

    currentMappings?.forEach(m => {
      console.log(`${m.region_name}: ${m.area_numbers} (${m.school_district})`);
    });

    // 2. 石垣東4-10丁目のマッピングを⑭㊸に更新
    console.log('\n【マッピング更新】');
    const chomeToUpdate = ['4丁目', '5丁目', '6丁目', '7丁目', '8丁目', '9丁目', '10丁目'];
    
    for (const chome of chomeToUpdate) {
      const regionName = `石垣東${chome}`;
      
      // 既存のマッピングを確認
      const { data: existing } = await supabase
        .from('beppu_area_mapping')
        .select('*')
        .eq('region_name', regionName)
        .single();

      if (existing) {
        // 更新
        const { error } = await supabase
          .from('beppu_area_mapping')
          .update({
            area_numbers: '⑭㊸',
            school_district: '鶴見台中学校',
            updated_at: new Date().toISOString()
          })
          .eq('region_name', regionName);

        if (error) {
          console.log(`❌ ${regionName}の更新失敗:`, error.message);
        } else {
          console.log(`✅ ${regionName}: ⑩㊸ → ⑭㊸`);
        }
      } else {
        // 新規追加
        const { error } = await supabase
          .from('beppu_area_mapping')
          .insert({
            region_name: regionName,
            area_numbers: '⑭㊸',
            school_district: '鶴見台中学校',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.log(`❌ ${regionName}の追加失敗:`, error.message);
        } else {
          console.log(`✅ ${regionName}: 新規追加 (⑭㊸)`);
        }
      }
    }

    // 3. 更新後のマッピングを確認
    console.log('\n【更新後のマッピング】');
    const { data: updatedMappings } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .ilike('region_name', '石垣東%')
      .order('region_name');

    updatedMappings?.forEach(m => {
      console.log(`${m.region_name}: ${m.area_numbers} (${m.school_district})`);
    });

    console.log('\n✅ 石垣東マッピング修正完了');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

fixIshigakiHigashiMapping()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
