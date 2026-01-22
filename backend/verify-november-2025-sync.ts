import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyNovember2025Sync() {
  console.log('=== 2025年11月のデータ同期状況確認 ===\n');

  try {
    // Get all November 2025 inquiries (excluding D and ダブり)
    const { data: allNovember, error: allError } = await supabase
      .from('sellers')
      .select('seller_number, name, inquiry_date, visit_acquisition_date, visit_date, confidence')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .order('inquiry_date', { ascending: true });

    if (allError) {
      console.error('クエリエラー:', allError);
      return;
    }

    console.log(`2025年11月の総反響数（D・ダブり除外）: ${allNovember?.length || 0} 件\n`);

    // Count those with visit_acquisition_date
    const withVisitAcq = allNovember?.filter(row => row.visit_acquisition_date) || [];
    console.log(`訪問取得日あり: ${withVisitAcq.length} 件`);
    
    // Count those with visit_date
    const withVisitDate = allNovember?.filter(row => row.visit_date) || [];
    console.log(`訪問日あり: ${withVisitDate.length} 件\n`);

    console.log('=== 訪問取得日ありのデータ ===\n');
    withVisitAcq.forEach((row, index) => {
      console.log(`${index + 1}. ${row.seller_number} - ${row.name}`);
      console.log(`   反響日: ${row.inquiry_date}`);
      console.log(`   訪問取得日: ${row.visit_acquisition_date}`);
      console.log(`   訪問日: ${row.visit_date || '(なし)'}`);
      console.log(`   確度: ${row.confidence}`);
      console.log('');
    });

    // Check if there are any with visit_date but no visit_acquisition_date
    const visitDateOnly = allNovember?.filter(row => row.visit_date && !row.visit_acquisition_date) || [];
    if (visitDateOnly.length > 0) {
      console.log(`\n=== 訪問日はあるが訪問取得日がないデータ: ${visitDateOnly.length} 件 ===\n`);
      visitDateOnly.forEach((row, index) => {
        console.log(`${index + 1}. ${row.seller_number} - ${row.name}`);
        console.log(`   反響日: ${row.inquiry_date}`);
        console.log(`   訪問日: ${row.visit_date}`);
        console.log(`   訪問取得日: (なし)`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

verifyNovember2025Sync();
