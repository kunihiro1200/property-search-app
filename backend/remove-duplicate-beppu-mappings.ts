import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 削除する古いマッピングのID（汎用的な学校区のもの）
const idsToDelete = [
  // 別府駅周辺の重複（中部中学校の方が正確）
  316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332,
  
  // 別府中央エリアの重複（朝日中学校の方が正確）
  349, 350, 351,
  
  // 別府西中学校の重複（青山中学校の方が正確）
  313, 314,
  
  // 北中の重複（朝日中学校の方が正確、北部中学校と別府中央エリアを削除）
  297, 350,
  
  // 中央町の重複（乙原エリアの方が正確）
  315,
];

async function removeDuplicates() {
  console.log('=== 重複している別府市エリアマッピングを削除 ===\n');
  console.log(`削除するマッピング数: ${idsToDelete.length}件\n`);

  // 削除前に確認
  const { data: toDelete } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .in('id', idsToDelete);

  if (toDelete) {
    console.log('削除するマッピング:');
    toDelete.forEach((row) => {
      console.log(`  ID ${row.id}: ${row.region_name} (${row.school_district}) → ${row.distribution_areas}`);
    });
    console.log();
  }

  // 削除実行
  const { error } = await supabase
    .from('beppu_area_mapping')
    .delete()
    .in('id', idsToDelete);

  if (error) {
    console.error('削除エラー:', error.message);
    return;
  }

  console.log('✅ 重複を削除しました\n');

  // 削除後の統計を表示
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

  console.log('削除後の学校区別マッピング数:');
  Object.entries(counts).sort().forEach(([district, count]) => {
    console.log(`  ${district}: ${count}件`);
  });

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`\n合計: ${total}件`);
}

removeDuplicates().catch(console.error);
