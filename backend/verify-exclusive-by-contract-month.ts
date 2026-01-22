import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyExclusiveByContractMonth() {
  try {
    console.log('\n=== 2025年11月 担当者I 専任媒介契約（契約年月ベース） ===\n');
    
    // 正しいロジック: contract_year_month が11月 + status = '専任媒介'
    console.log('【正しいロジック】contract_year_month が11月 + visit_assignee = "I" + status = "専任媒介"');
    const { data: correctLogic, error: correctError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_date, contract_year_month, visit_assignee, status, confidence')
      .eq('visit_assignee', 'I')
      .eq('status', '専任媒介')
      .gte('contract_year_month', '2025-11-01')
      .lte('contract_year_month', '2025-11-30T23:59:59.999Z')
      .not('confidence', 'in', '("D","ダブり")');

    if (correctError) throw correctError;
    
    console.log(`カウント: ${correctLogic?.length || 0}件\n`);
    
    if (correctLogic && correctLogic.length > 0) {
      console.log('専任媒介契約の詳細:');
      correctLogic.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.seller_number}`);
        console.log(`   問い合わせ日: ${row.inquiry_date}`);
        console.log(`   訪問日: ${row.visit_date}`);
        console.log(`   契約年月: ${row.contract_year_month}`);
        console.log(`   営担: ${row.visit_assignee}`);
        console.log(`   ステータス: ${row.status}`);
        console.log(`   確度: ${row.confidence || '未設定'}`);
      });
    }
    
    // 比較: visit_date ベース
    console.log('\n\n=== 比較: visit_date ベース ===\n');
    const { data: visitDateBased, error: visitError } = await supabase
      .from('sellers')
      .select('seller_number, status')
      .eq('visit_assignee', 'I')
      .eq('status', '専任媒介')
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30')
      .not('confidence', 'in', '("D","ダブり")');

    if (visitError) throw visitError;
    console.log(`visit_date ベース: ${visitDateBased?.length || 0}件`);
    
    // 結果サマリー
    console.log('\n\n=== 結果サマリー ===\n');
    console.log(`contract_year_month ベース: ${correctLogic?.length || 0}件`);
    console.log(`visit_date ベース: ${visitDateBased?.length || 0}件`);
    console.log(`ユーザー期待値: 3件`);
    
    if ((correctLogic?.length || 0) === 3) {
      console.log('\n✅ contract_year_month ベースで期待値と一致しました！');
    } else {
      console.log(`\n⚠️ contract_year_month ベースでも期待値と一致しません（${correctLogic?.length || 0}件 vs 3件）`);
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

verifyExclusiveByContractMonth();
