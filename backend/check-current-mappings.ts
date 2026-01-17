import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCurrentMappings() {
  console.log('=== 現在の別府市エリアマッピング状況 ===\n');

  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .select('school_district, region_name, distribution_areas');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  const counts: Record<string, number> = {};
  const areaCount: Record<string, number> = {};
  
  data?.forEach((row: any) => {
    counts[row.school_district] = (counts[row.school_district] || 0) + 1;
    
    // エリア番号ごとにカウント
    const areas: string[] = Array.from(row.distribution_areas);
    areas.forEach((area) => {
      areaCount[area] = (areaCount[area] || 0) + 1;
    });
  });

  console.log('学校区別マッピング数:');
  Object.entries(counts).sort().forEach(([district, count]) => {
    console.log(`  ${district}: ${count}件`);
  });

  console.log(`\n合計: ${data?.length || 0}件\n`);

  console.log('エリア番号別マッピング数:');
  Object.entries(areaCount).sort().forEach(([area, count]) => {
    console.log(`  ${area}: ${count}件`);
  });
}

checkCurrentMappings().catch(console.error);
