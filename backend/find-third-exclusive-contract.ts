import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function findThirdExclusiveContract() {
  try {
    console.log('\n=== 3件目の専任媒介契約を探す ===\n');
    
    // 11月の担当者Iの全データを取得
    const { data: allData, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_date, visit_assignee, status, confidence, contract_year_month')
      .eq('visit_assignee', 'I')
      .gte('visit_date', '2025-11-01')
      .lte('visit_date', '2025-11-30')
      .not('confidence', 'in', '("D","ダブり")');

    if (error) throw error;
    
    console.log(`担当者Iの11月訪問データ: ${allData?.length || 0}件\n`);
    
    // "専任" を含むステータスを探す
    console.log('=== "専任" を含むステータスの案件 ===\n');
    const exclusiveRelated = allData?.filter(row => 
      row.status && row.status.includes('専任')
    ) || [];
    
    console.log(`"専任"を含む案件: ${exclusiveRelated.length}件\n`);
    exclusiveRelated.forEach((row, index) => {
      console.log(`${index + 1}. ${row.seller_number}`);
      console.log(`   ステータス: ${row.status}`);
      console.log(`   訪問日: ${row.visit_date}`);
      console.log(`   契約年月: ${row.contract_year_month || '未設定'}`);
      console.log('');
    });
    
    // "媒介" を含むステータスを探す
    console.log('\n=== "媒介" を含むステータスの案件 ===\n');
    const baikaiRelated = allData?.filter(row => 
      row.status && row.status.includes('媒介')
    ) || [];
    
    console.log(`"媒介"を含む案件: ${baikaiRelated.length}件\n`);
    baikaiRelated.forEach((row, index) => {
      console.log(`${index + 1}. ${row.seller_number}`);
      console.log(`   ステータス: ${row.status}`);
      console.log(`   訪問日: ${row.visit_date}`);
      console.log(`   契約年月: ${row.contract_year_month || '未設定'}`);
      console.log('');
    });
    
    // 全ステータスの一覧
    console.log('\n=== 全ステータス一覧 ===\n');
    if (allData) {
      allData.forEach((row, index) => {
        console.log(`${index + 1}. ${row.seller_number} - ${row.status}`);
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

findThirdExclusiveContract();
