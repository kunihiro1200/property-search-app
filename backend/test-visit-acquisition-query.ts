import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testVisitAcquisitionQuery() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 visit_acquisition_dateクエリのテストを開始します...\n');

  const year = 2026;
  const month = 1;
  
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
  
  console.log(`📅 期間: ${startDate} ～ ${endDate}\n`);

  // テスト1: 基本的なカウントクエリ
  console.log('テスト1: 基本的なカウントクエリ');
  const { count: count1, error: error1 } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .gte('visit_acquisition_date', startDate)
    .lte('visit_acquisition_date', endDate);

  console.log('結果:', { count: count1, error: error1 });
  console.log('');

  // テスト2: confidenceフィルタ付き
  console.log('テスト2: confidenceフィルタ付き');
  const { count: count2, error: error2 } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .gte('visit_acquisition_date', startDate)
    .lte('visit_acquisition_date', endDate)
    .not('confidence', 'in', '("D","ダブり")');

  console.log('結果:', { count: count2, error: error2 });
  console.log('');

  // テスト3: 実際のデータを取得
  console.log('テスト3: 実際のデータを取得（最大5件）');
  const { data: data3, error: error3 } = await supabase
    .from('sellers')
    .select('seller_number, visit_acquisition_date, confidence')
    .gte('visit_acquisition_date', startDate)
    .lte('visit_acquisition_date', endDate)
    .limit(5);

  console.log('結果:', { count: data3?.length, error: error3 });
  if (data3 && data3.length > 0) {
    console.log('サンプルデータ:');
    data3.forEach(row => {
      console.log(`  - ${row.seller_number}: ${row.visit_acquisition_date} (confidence: ${row.confidence})`);
    });
  }
}

testVisitAcquisitionQuery();
