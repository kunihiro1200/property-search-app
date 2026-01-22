import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkLatestData() {
  console.log('=== 最新の反響日付を確認 ===\n');
  
  // 最新の反響日付を持つ売主を取得
  const { data: latestSellers, error } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, created_at')
    .not('inquiry_date', 'is', null)
    .order('inquiry_date', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('エラー:', error);
    return;
  }
  
  console.log('【最新の反響日付TOP10】');
  latestSellers.forEach((s: any, i: number) => {
    console.log(`${i+1}. ${s.seller_number}: ${s.inquiry_date} (反響年: ${s.inquiry_year})`);
  });
  
  // 12/9のデータがあるか確認
  const { data: dec9Sellers } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .gte('inquiry_date', '2025-12-09')
    .lte('inquiry_date', '2025-12-09');
  
  console.log(`\n【2025/12/9のデータ】: ${dec9Sellers?.length || 0}件`);
  if (dec9Sellers && dec9Sellers.length > 0) {
    dec9Sellers.forEach((s: any) => console.log(`  ${s.seller_number}: ${s.inquiry_date}`));
  }
  
  // 12/8のデータがあるか確認
  const { data: dec8Sellers } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .gte('inquiry_date', '2025-12-08')
    .lte('inquiry_date', '2025-12-08');
  
  console.log(`\n【2025/12/8のデータ】: ${dec8Sellers?.length || 0}件`);
  
  // 12/7のデータがあるか確認
  const { data: dec7Sellers } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .gte('inquiry_date', '2025-12-07')
    .lte('inquiry_date', '2025-12-07');
  
  console.log(`【2025/12/7のデータ】: ${dec7Sellers?.length || 0}件`);
}

checkLatestData().catch(console.error);
