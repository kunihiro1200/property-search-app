import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkInquiryDateIssue() {
  console.log('=== 反響日付の問題を調査 ===\n');

  // AA5210のデータを取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA5210')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('【DBの生データ】');
  console.log('  seller_number:', seller.seller_number);
  console.log('  inquiry_date (raw):', seller.inquiry_date);
  console.log('  inquiry_year:', seller.inquiry_year);
  console.log('  typeof inquiry_date:', typeof seller.inquiry_date);

  // new Date()で変換した場合
  if (seller.inquiry_date) {
    const dateObj = new Date(seller.inquiry_date);
    console.log('\n【new Date()で変換】');
    console.log('  Date object:', dateObj);
    console.log('  toISOString():', dateObj.toISOString());
    console.log('  toLocaleDateString("ja-JP"):', dateObj.toLocaleDateString('ja-JP'));
    console.log('  getFullYear():', dateObj.getFullYear());
    console.log('  getMonth():', dateObj.getMonth() + 1);
    console.log('  getDate():', dateObj.getDate());
  }

  // 2026年のデータを探す
  console.log('\n【2026年のデータを検索】');
  const { data: sellers2026 } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .gte('inquiry_date', '2026-01-01')
    .lte('inquiry_date', '2026-12-31')
    .limit(20);

  if (sellers2026 && sellers2026.length > 0) {
    console.log(`  ${sellers2026.length}件見つかりました:`);
    sellers2026.forEach((s: any) => {
      console.log(`    ${s.seller_number}: ${s.inquiry_date} (反響年: ${s.inquiry_year})`);
    });
  } else {
    console.log('  2026年のデータはありません');
  }

  // 2025年以降のデータを探す
  console.log('\n【2025年以降のデータを検索】');
  const { data: sellersFuture } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .gte('inquiry_date', '2025-01-01')
    .order('inquiry_date', { ascending: false })
    .limit(20);

  if (sellersFuture && sellersFuture.length > 0) {
    console.log(`  ${sellersFuture.length}件見つかりました:`);
    sellersFuture.forEach((s: any) => {
      console.log(`    ${s.seller_number}: ${s.inquiry_date} (反響年: ${s.inquiry_year})`);
    });
  } else {
    console.log('  2025年以降のデータはありません');
  }
}

checkInquiryDateIssue().catch(console.error);
