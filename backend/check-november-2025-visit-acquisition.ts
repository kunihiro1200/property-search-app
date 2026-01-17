import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025VisitAcquisition() {
  try {
    console.log('=== 2025年11月の訪問査定取得数調査 ===\n');

    // 1. 2025年11月の全売主データを取得（D、ダブり除く）
    const { data: allSellers, error } = await supabase
      .from('sellers')
      .select('seller_number, status, visit_acquisition_date, visit_date, visit_time, visit_assignee, inquiry_date, confidence')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .order('seller_number');
    
    if (error) throw error;
    
    console.log(`2025年11月の依頼件数（D、ダブり除く）: ${allSellers?.length || 0}件\n`);

    // 2. 訪問査定取得数をカウント
    const visitAcquisitionCount = allSellers?.filter(row => row.visit_acquisition_date).length || 0;
    console.log(`visit_acquisition_date（訪問取得日）が存在: ${visitAcquisitionCount}件`);
    
    const visitDateCount = allSellers?.filter(row => row.visit_date).length || 0;
    console.log(`visit_date（訪問日）が存在: ${visitDateCount}件\n`);

    // 3. 訪問査定取得ありの詳細リスト
    console.log('=== 訪問査定取得ありの売主リスト（visit_acquisition_date が存在） ===');
    const visitAcquisitionSellers = allSellers?.filter(row => row.visit_acquisition_date) || [];
    
    visitAcquisitionSellers.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   visit_acquisition_date: ${seller.visit_acquisition_date || 'なし'}`);
      console.log(`   visit_date: ${seller.visit_date || 'なし'}`);
      console.log(`   visit_time: ${seller.visit_time || 'なし'}`);
      console.log(`   visit_assignee: ${seller.visit_assignee || 'なし'}`);
      console.log(`   status: ${seller.status}`);
      console.log(`   confidence: ${seller.confidence}`);
      console.log('');
    });

    // 4. PerformanceMetricsService のクエリを再現
    console.log('\n=== PerformanceMetricsService で使用されているクエリの再現 ===');
    console.log('現在のコード: visit_date の範囲でカウント');
    
    // visit_date が2025年11月の範囲内のものをカウント
    const { count: currentMetricsCount, error: currentError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30T23:59:59')
      .not('visit_date', 'is', null);
    
    if (currentError) throw currentError;
    console.log(`現在のクエリ結果（visit_date ベース）: ${currentMetricsCount || 0}件\n`);

    // 5. 正しいクエリ: inquiry_date が2025年11月で visit_acquisition_date が存在
    console.log('=== 正しいクエリ: inquiry_date ベースで visit_acquisition_date をカウント ===');
    const correctCount = allSellers?.filter(row => row.visit_acquisition_date).length || 0;
    console.log(`正しいカウント: ${correctCount}件`);
    
    console.log(`\n期待値: 24件`);
    console.log(`実際の値: ${correctCount}件`);
    console.log(`差分: ${24 - correctCount}件`);

  } catch (error) {
    console.error('エラー:', error);
  }
}

checkNovember2025VisitAcquisition();
