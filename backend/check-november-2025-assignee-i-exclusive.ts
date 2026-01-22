import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025AssigneeIExclusive() {
  try {
    console.log('\n=== 2025年11月 担当者I 専任契約チェック ===\n');
    console.log('専任契約のカウント条件:');
    console.log('1. visit_date が 2025年11月');
    console.log('2. visit_assignee が "I"');
    console.log('3. confidence が "D" または "ダブり" ではない\n');

    // 実際のロジックに合わせて専任契約をカウント
    const { data: exclusiveData, error: exclusiveError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_date, visit_assignee, confidence, status')
      .eq('visit_assignee', 'I')
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30')
      .not('confidence', 'in', '("D","ダブり")');

    if (exclusiveError) throw exclusiveError;
    
    console.log(`専任契約の件数: ${exclusiveData?.length || 0}件\n`);
    
    if (exclusiveData && exclusiveData.length > 0) {
      console.log('専任契約の詳細:');
      exclusiveData.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.seller_number}`);
        console.log(`   問い合わせ日: ${row.inquiry_date}`);
        console.log(`   訪問日: ${row.visit_date}`);
        console.log(`   営担: ${row.visit_assignee}`);
        console.log(`   確度: ${row.confidence || '未設定'}`);
        console.log(`   ステータス: ${row.status}`);
      });
    }

    // 全体の担当者Iの案件数も確認（問い合わせ日ベース）
    console.log('\n\n=== 2025年11月 担当者I 全案件（問い合わせ日ベース） ===\n');
    const { data: allData, error: allError } = await supabase
      .from('sellers')
      .select('status, visit_date, visit_assignee')
      .eq('visit_assignee', 'I')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01');

    if (allError) throw allError;
    
    const totalCount = allData?.length || 0;
    const withVisitDate = allData?.filter(row => row.visit_date !== null).length || 0;
    
    console.log(`総案件数: ${totalCount}件`);
    console.log(`訪問日が設定されている: ${withVisitDate}件`);
    
    // ステータスの内訳を表示
    console.log('\n=== ステータス別内訳 ===\n');
    const statusCounts = allData?.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });

    // 訪問日が11月のものを確認
    console.log('\n\n=== 訪問日が2025年11月のもの ===\n');
    const visitInNovember = allData?.filter(row => {
      if (!row.visit_date) return false;
      const visitDate = new Date(row.visit_date);
      return visitDate >= new Date('2025-11-01') && visitDate <= new Date('2025-11-30');
    }) || [];
    
    console.log(`訪問日が11月の件数: ${visitInNovember.length}件`);

  } catch (error) {
    console.error('エラー:', error);
  }
}

checkNovember2025AssigneeIExclusive();
