import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025Details() {
  console.log('=== 2025年11月の訪問査定取得データ詳細 ===\n');

  try {
    // Query with the same logic as PerformanceMetricsService
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, name, inquiry_date, visit_acquisition_date, confidence')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .not('visit_acquisition_date', 'is', null)
      .order('inquiry_date', { ascending: true });

    if (error) {
      console.error('クエリエラー:', error);
      return;
    }

    console.log(`見つかった件数: ${data?.length || 0} 件\n`);

    if (data && data.length > 0) {
      console.log('詳細データ:');
      data.forEach((row, index) => {
        console.log(`${index + 1}. ${row.seller_number} - ${row.name}`);
        console.log(`   反響日: ${row.inquiry_date}`);
        console.log(`   訪問取得日: ${row.visit_acquisition_date}`);
        console.log(`   確度: ${row.confidence}`);
        console.log('');
      });
    }

    // Also check total inquiries for November 2025
    const { count: totalCount } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")');

    console.log(`\n2025年11月の総反響数（D・ダブり除外）: ${totalCount || 0} 件`);
    console.log(`訪問取得日あり: ${data?.length || 0} 件`);
    console.log(`訪問取得率: ${totalCount ? ((data?.length || 0) / totalCount * 100).toFixed(1) : 0}%`);

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkNovember2025Details();
