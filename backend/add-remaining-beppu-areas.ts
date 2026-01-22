import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// まだマッピングされていない住所を追加
const remainingMappings = [
  // 北石垣 - 中部中学校区
  { school_district: '中部中学校', region_name: '北石垣', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  
  // 野口原 - 中部中学校区
  { school_district: '中部中学校', region_name: '野口原', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  
  // その他の不足している可能性のある住所
  { school_district: '中部中学校', region_name: '南石垣', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣東', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '石垣西', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
];

async function addRemainingMappings() {
  console.log('=== 残りの別府市エリアマッピングを追加 ===\n');
  console.log(`追加するマッピング数: ${remainingMappings.length}件\n`);

  const { error } = await supabase
    .from('beppu_area_mapping')
    .insert(remainingMappings);
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log('✅ すべてのマッピングを追加しました\n');

  // 更新後の統計を表示
  const { data } = await supabase
    .from('beppu_area_mapping')
    .select('school_district');

  const counts: Record<string, number> = {};
  if (data) {
    data.forEach((row) => {
      const district = row.school_district;
      counts[district] = (counts[district] || 0) + 1;
    });
  }

  console.log('更新後の学校区別マッピング数:');
  Object.entries(counts).sort().forEach(([district, count]) => {
    console.log(`  ${district}: ${count}件`);
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`\n合計: ${total}件`);
}

addRemainingMappings().catch(console.error);
