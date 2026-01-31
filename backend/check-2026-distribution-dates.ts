// 2026年の配信日を持つ物件を確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  console.log('=== 2026年の配信日を持つ物件を確認 ===\n');
  
  // 2026年の配信日を持つ物件を取得
  const { data: data2026, error: error2026 } = await supabase
    .from('property_listings')
    .select('property_number, distribution_date, atbb_status')
    .gte('distribution_date', '2026-01-01')
    .order('distribution_date', { ascending: false })
    .limit(50);
  
  if (error2026) {
    console.error('エラー:', error2026.message);
    return;
  }
  
  console.log(`2026年の配信日を持つ物件: ${data2026?.length}件\n`);
  
  data2026?.forEach((row, i) => {
    console.log(`${i+1}. ${row.property_number} - 配信日: ${row.distribution_date} - ${row.atbb_status || '(ステータスなし)'}`);
  });
  
  // 全体の配信日分布を確認
  console.log('\n=== 配信日の年別分布 ===\n');
  
  const { data: allDates } = await supabase
    .from('property_listings')
    .select('distribution_date')
    .not('distribution_date', 'is', null);
  
  const yearCounts: Record<string, number> = {};
  allDates?.forEach(row => {
    if (row.distribution_date) {
      const year = row.distribution_date.substring(0, 4);
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });
  
  Object.entries(yearCounts).sort((a, b) => b[0].localeCompare(a[0])).forEach(([year, count]) => {
    console.log(`${year}年: ${count}件`);
  });
  
  // NULLの件数
  const { count: nullCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('distribution_date', null);
  
  console.log(`\n配信日がNULL: ${nullCount}件`);
}

check();
