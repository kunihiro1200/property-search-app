import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 不足している住所を追加
const additionalMappings = [
  // ⑨ 青山中学校区 - 追加分
  { school_district: '青山中学校', region_name: '南立石板地町', distribution_areas: '⑨㊷', other_region: '別府駅周辺' },
  { school_district: '青山中学校', region_name: '堀田', distribution_areas: '⑨', other_region: null },
  { school_district: '青山中学校', region_name: '扇山', distribution_areas: '⑨', other_region: null },
  
  // ⑩ 中部中学校区 - 追加分（駅前・北浜エリア）
  { school_district: '中部中学校', region_name: '駅前町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '駅前本町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '北浜1丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '北浜2丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '北浜3丁目', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '北的ヶ浜町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '京町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '幸町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '新港町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '野口中町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '野口元町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '富士見町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '南的ヶ浜町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '餅ヶ浜町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '元町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '弓ヶ浜町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  { school_district: '中部中学校', region_name: '若草町', distribution_areas: '⑩㊸', other_region: '鉄輪線より下' },
  
  // ⑪ 北部中学校区 - 追加分
  { school_district: '北部中学校', region_name: '野田', distribution_areas: '⑪', other_region: null },
  
  // ⑫ 朝日中学校区 - 大幅追加
  { school_district: '朝日中学校', region_name: '明礬', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '新別府', distribution_areas: '⑫㊸', other_region: '鉄輪線より下' },
  { school_district: '朝日中学校', region_name: '馬場', distribution_areas: '⑫㊸', other_region: '鉄輪線より下' },
  { school_district: '朝日中学校', region_name: '火売', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '北中', distribution_areas: '⑫㊸', other_region: '鉄輪線より下' },
  { school_district: '朝日中学校', region_name: '御幸', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '風呂本', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '井田', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '鉄輪', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '上北鉄輪', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '鉄輪東', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '天間', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '湯山', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '竹の内', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '大畑', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '小倉', distribution_areas: '⑫', other_region: null },
  { school_district: '朝日中学校', region_name: '朝日ケ丘町', distribution_areas: '⑫', other_region: null },
  
  // ⑬ 東山中学校区 - 追加分
  { school_district: '東山中学校', region_name: '東山一区', distribution_areas: '⑬', other_region: null },
  { school_district: '東山中学校', region_name: '東山二区', distribution_areas: '⑬', other_region: null },
  { school_district: '東山中学校', region_name: '城島', distribution_areas: '⑬', other_region: null },
  { school_district: '東山中学校', region_name: '山の口', distribution_areas: '⑬', other_region: null },
  { school_district: '東山中学校', region_name: '枝郷', distribution_areas: '⑬', other_region: null },
];

async function addMissingMappings() {
  console.log('=== 不足している別府市エリアマッピングを追加 ===\n');
  console.log(`追加するマッピング数: ${additionalMappings.length}件\n`);

  // バッチで挿入
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < additionalMappings.length; i += batchSize) {
    const batch = additionalMappings.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('beppu_area_mapping')
      .insert(batch);
    
    if (error) {
      console.error(`バッチ ${i / batchSize + 1} エラー:`, error.message);
      return;
    }
    
    inserted += batch.length;
    console.log(`  ${inserted}/${additionalMappings.length}件 挿入完了`);
  }

  console.log('\n✅ すべてのマッピングを追加しました\n');

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

addMissingMappings().catch(console.error);
