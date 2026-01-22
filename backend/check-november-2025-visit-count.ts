import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025VisitCount() {
  try {
    console.log('=== 2025年11月の訪問査定取得数調査 ===\n');

    // 1. 2025年11月の全売主データを取得（D、ダブり除く）
    const { data: allSellers, error } = await supabase
      .from('sellers')
      .select('seller_number, status, visit_date, visit_time, visit_assignee, inquiry_date, confidence')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .order('seller_number');
    
    if (error) throw error;
    
    console.log(`2025年11月の依頼件数（D、ダブり除く）: ${allSellers?.length || 0}件\n`);

    // 2. 訪問査定数をカウント（複数の条件で）
    
    // 条件1: visit_date が存在する
    const visitDateCount = allSellers?.filter(row => row.visit_date).length || 0;
    console.log(`visit_date が存在: ${visitDateCount}件`);
    
    // 条件2: visit_assignee が存在する
    const visitAssigneeCount = allSellers?.filter(row => row.visit_assignee).length || 0;
    console.log(`visit_assignee が存在: ${visitAssigneeCount}件\n`);

    // 3. 訪問査定ありの詳細リスト
    console.log('=== 訪問査定ありの売主リスト（visit_date が存在） ===');
    const visitSellers = allSellers?.filter(row => row.visit_date) || [];
    
    visitSellers.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.seller_number}`);
      console.log(`   visit_date: ${seller.visit_date || 'なし'}`);
      console.log(`   visit_time: ${seller.visit_time || 'なし'}`);
      console.log(`   visit_assignee: ${seller.visit_assignee || 'なし'}`);
      console.log(`   status: ${seller.status}`);
      console.log(`   confidence: ${seller.confidence}`);
      console.log('');
    });

    // 4. ブラウザで使用されているクエリを確認
    console.log('\n=== PerformanceMetricsService で使用されているクエリの再現 ===');
    
    // visit_date が存在するものをカウント（PerformanceMetricsServiceのロジック）
    const { count: metricsCount, error: metricsError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30T23:59:59')
      .not('visit_date', 'is', null);
    
    if (metricsError) throw metricsError;
    
    console.log(`PerformanceMetricsService のクエリ結果: ${metricsCount || 0}件\n`);

    // 5. 訪問日付が2025年11月の範囲内かチェック
    console.log('=== 訪問日付の範囲チェック ===');
    const visitInNovember = visitSellers.filter(row => {
      if (!row.visit_date) return false;
      const visitDate = new Date(row.visit_date);
      return visitDate >= new Date('2025-11-01') && visitDate <= new Date('2025-11-30T23:59:59');
    });
    console.log(`訪問日が2025年11月の範囲内: ${visitInNovember.length}件`);
    
    const visitOutsideNovember = visitSellers.filter(row => {
      if (!row.visit_date) return false;
      const visitDate = new Date(row.visit_date);
      return visitDate < new Date('2025-11-01') || visitDate > new Date('2025-11-30T23:59:59');
    });
    console.log(`訪問日が2025年11月の範囲外: ${visitOutsideNovember.length}件`);
    
    if (visitOutsideNovember.length > 0) {
      console.log('\n範囲外の訪問日:');
      visitOutsideNovember.forEach(seller => {
        console.log(`  ${seller.seller_number}: ${seller.visit_date}`);
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

checkNovember2025VisitCount();
