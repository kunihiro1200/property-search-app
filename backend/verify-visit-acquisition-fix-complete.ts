import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyFix() {
  console.log('=== 訪問取得日修正の検証 ===\n');

  try {
    // 1. 2025年11月の訪問取得日でカウント（修正後のロジック）
    console.log('1. visit_acquisition_date ベースでカウント（修正後）:');
    const startDate = new Date(2025, 10, 1).toISOString(); // 11月 = month 10
    const endDate = new Date(2025, 10, 30, 23, 59, 59).toISOString();

    const { count: visitAcqCount, error: visitAcqError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('visit_acquisition_date', startDate)
      .lte('visit_acquisition_date', endDate)
      .not('confidence', 'in', '("D","ダブり")');

    if (visitAcqError) {
      console.error('エラー:', visitAcqError);
    } else {
      console.log(`   訪問査定取得数: ${visitAcqCount || 0} 件`);
      console.log(`   期待値: 24 件`);
      console.log(`   ✅ ${visitAcqCount === 24 ? '一致しました！' : `差分: ${24 - (visitAcqCount || 0)} 件`}\n`);
    }

    // 2. 旧ロジック（inquiry_date ベース）でカウント
    console.log('2. inquiry_date ベースでカウント（修正前）:');
    const { count: inquiryCount, error: inquiryError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('inquiry_date', startDate)
      .lte('inquiry_date', endDate)
      .not('confidence', 'in', '("D","ダブり")')
      .not('visit_acquisition_date', 'is', null);

    if (inquiryError) {
      console.error('エラー:', inquiryError);
    } else {
      console.log(`   訪問査定取得数: ${inquiryCount || 0} 件\n`);
    }

    // 3. 差分の詳細を表示
    console.log('3. 差分の詳細（visit_acquisition_date が11月だが inquiry_date が11月でない）:');
    const { data: diffData, error: diffError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_acquisition_date')
      .gte('visit_acquisition_date', startDate)
      .lte('visit_acquisition_date', endDate)
      .not('confidence', 'in', '("D","ダブり")')
      .or(`inquiry_date.lt.${startDate},inquiry_date.gt.${endDate}`)
      .order('seller_number');

    if (diffError) {
      console.error('エラー:', diffError);
    } else if (diffData && diffData.length > 0) {
      console.log(`   ${diffData.length} 件の差分があります:\n`);
      diffData.forEach(row => {
        console.log(`   - ${row.seller_number}: 反響日=${row.inquiry_date}, 訪問取得日=${row.visit_acquisition_date}`);
      });
    } else {
      console.log('   差分なし（すべて inquiry_date も11月）');
    }

    console.log('\n=== 検証完了 ===');

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

verifyFix();
