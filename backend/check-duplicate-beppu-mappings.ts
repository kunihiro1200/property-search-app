import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDuplicates() {
  console.log('=== 重複している別府市エリアマッピングを確認 ===\n');

  const { data } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .order('region_name')
    .order('created_at');

  if (!data) {
    console.log('データが見つかりません');
    return;
  }

  // region_name でグループ化
  const grouped = new Map<string, any[]>();
  data.forEach((row) => {
    const existing = grouped.get(row.region_name) || [];
    existing.push(row);
    grouped.set(row.region_name, existing);
  });

  // 重複を表示
  const duplicates = Array.from(grouped.entries()).filter(([_, rows]) => rows.length > 1);

  if (duplicates.length === 0) {
    console.log('重複はありません');
    return;
  }

  console.log(`重複している地域名: ${duplicates.length}件\n`);

  duplicates.forEach(([regionName, rows]) => {
    console.log(`\n【${regionName}】 - ${rows.length}件`);
    rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ID: ${row.id}`);
      console.log(`     学校区: ${row.school_district}`);
      console.log(`     エリア: ${row.distribution_areas}`);
      console.log(`     その他: ${row.other_region || 'なし'}`);
      console.log(`     作成日: ${row.created_at}`);
    });
  });
}

checkDuplicates().catch(console.error);
