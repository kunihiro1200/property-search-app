import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyNovember2025Exclusive3Cases() {
  try {
    console.log('\n=== 2025年11月 担当者I 専任媒介契約の詳細確認 ===\n');
    
    // 現在のロジック: visit_date + visit_assignee のみ
    console.log('【現在のロジック】visit_date が11月 + visit_assignee = "I"');
    const { data: currentLogic, error: currentError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_date, visit_assignee, status, confidence')
      .eq('visit_assignee', 'I')
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30')
      .not('confidence', 'in', '("D","ダブり")');

    if (currentError) throw currentError;
    
    console.log(`カウント: ${currentLogic?.length || 0}件\n`);
    
    // 新しいロジック: status = '専任媒介' を追加
    console.log('【新しいロジック】visit_date が11月 + visit_assignee = "I" + status = "専任媒介"');
    const { data: newLogic, error: newError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_date, visit_assignee, status, confidence')
      .eq('visit_assignee', 'I')
      .eq('status', '専任媒介')
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30')
      .not('confidence', 'in', '("D","ダブり")');

    if (newError) throw newError;
    
    console.log(`カウント: ${newLogic?.length || 0}件\n`);
    
    if (newLogic && newLogic.length > 0) {
      console.log('専任媒介契約の詳細:');
      newLogic.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.seller_number}`);
        console.log(`   問い合わせ日: ${row.inquiry_date}`);
        console.log(`   訪問日: ${row.visit_date}`);
        console.log(`   営担: ${row.visit_assignee}`);
        console.log(`   ステータス: ${row.status}`);
        console.log(`   確度: ${row.confidence || '未設定'}`);
      });
    }
    
    // ステータスの内訳を表示
    console.log('\n\n=== 現在のロジックでカウントされる12件のステータス内訳 ===\n');
    if (currentLogic) {
      const statusCounts = currentLogic.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        console.log(`${status}: ${count}件`);
      });
    }
    
    // 期待値との比較
    console.log('\n\n=== 結果サマリー ===\n');
    console.log(`現在のロジック: ${currentLogic?.length || 0}件`);
    console.log(`新しいロジック: ${newLogic?.length || 0}件`);
    console.log(`ユーザー期待値: 3件`);
    
    if ((newLogic?.length || 0) === 3) {
      console.log('\n✅ 新しいロジックで期待値と一致しました！');
    } else {
      console.log(`\n⚠️ 新しいロジックでも期待値と一致しません（${newLogic?.length || 0}件 vs 3件）`);
      console.log('追加調査が必要です。');
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

verifyNovember2025Exclusive3Cases();
