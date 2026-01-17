import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkInquiryFieldsData() {
  console.log('🔍 売主データの反響年・サイトフィールドを確認中...\n');

  // 最新の10件の売主データを取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_year, inquiry_site, site, inquiry_date, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('⚠️  売主データが見つかりません');
    return;
  }

  console.log(`📊 最新の${sellers.length}件の売主データ:\n`);

  sellers.forEach((seller, index) => {
    console.log(`${index + 1}. 売主番号: ${seller.seller_number || '未設定'}`);
    console.log(`   ID: ${seller.id}`);
    console.log(`   反響年 (inquiry_year): ${seller.inquiry_year || '❌ 未設定'}`);
    console.log(`   サイト (inquiry_site): ${seller.inquiry_site || '❌ 未設定'}`);
    console.log(`   サイト (site - 旧): ${seller.site || '未設定'}`);
    console.log(`   反響日 (inquiry_date): ${seller.inquiry_date || '未設定'}`);
    console.log(`   作成日: ${new Date(seller.created_at).toLocaleString('ja-JP')}`);
    console.log('');
  });

  // 統計情報
  const totalWithInquiryYear = sellers.filter(s => s.inquiry_year).length;
  const totalWithInquirySite = sellers.filter(s => s.inquiry_site).length;
  const totalWithSite = sellers.filter(s => s.site).length;

  console.log('📈 統計情報:');
  console.log(`   反響年が設定されている: ${totalWithInquiryYear}/${sellers.length}件`);
  console.log(`   サイト(inquiry_site)が設定されている: ${totalWithInquirySite}/${sellers.length}件`);
  console.log(`   サイト(site-旧)が設定されている: ${totalWithSite}/${sellers.length}件`);
}

checkInquiryFieldsData()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
