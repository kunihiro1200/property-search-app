import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6941() {
  console.log('=== 買主6941のデータ確認 ===\n');

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6941')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!buyer) {
    console.log('買主6941が見つかりません');
    return;
  }

  console.log('買主番号:', buyer.buyer_number);
  console.log('氏名:', buyer.name);
  console.log('最新状況:', buyer.latest_status);
  console.log('配信種別:', buyer.distribution_type);
  console.log('希望エリア:', buyer.desired_area);
  console.log('希望種別:', buyer.desired_property_type);
  console.log('問合せ元:', buyer.inquiry_source);
  console.log('削除日時:', buyer.deleted_at);
  console.log('受付日:', buyer.reception_date);
  console.log('物件番号:', buyer.property_number);

  console.log('\n=== フィルタリング条件チェック ===\n');

  // 1. 削除済みチェック
  if (buyer.deleted_at) {
    console.log('❌ 削除済み: deleted_at =', buyer.deleted_at);
  } else {
    console.log('✅ 削除済みではない');
  }

  // 2. 配信種別チェック
  const distributionType = (buyer.distribution_type || '').trim();
  if (distributionType === '要') {
    console.log('✅ 配信種別: 要');
  } else {
    console.log('❌ 配信種別が「要」ではない:', distributionType);
  }

  // 3. 最新状況チェック
  const latestStatus = (buyer.latest_status || '').trim();
  if (!latestStatus) {
    console.log('❌ 最新状況が空欄');
  } else if (latestStatus.includes('A') || latestStatus.includes('B') || latestStatus.includes('C') || latestStatus.includes('不明')) {
    console.log('✅ 最新状況: A/B/C/不明を含む -', latestStatus);
  } else {
    console.log('❌ 最新状況がA/B/C/不明を含まない:', latestStatus);
  }

  // 4. 希望条件チェック
  const desiredArea = (buyer.desired_area || '').trim();
  const desiredPropertyType = (buyer.desired_property_type || '').trim();
  if (desiredArea || desiredPropertyType) {
    console.log('✅ 希望条件あり: エリア=', desiredArea, ', 種別=', desiredPropertyType);
  } else {
    console.log('❌ 希望エリアと希望種別が両方空欄');
  }

  // 5. 業者問合せチェック
  const inquirySource = (buyer.inquiry_source || '').trim();
  if (inquirySource.includes('業者問合せ') || distributionType.includes('業者問合せ')) {
    console.log('❌ 業者問合せ');
  } else {
    console.log('✅ 業者問合せではない');
  }

  console.log('\n=== 結論 ===\n');
  
  const reasons: string[] = [];
  
  if (buyer.deleted_at) reasons.push('削除済み');
  if (distributionType !== '要') reasons.push(`配信種別が「要」ではない（${distributionType}）`);
  if (!latestStatus) {
    reasons.push('最新状況が空欄');
  } else if (!latestStatus.includes('A') && !latestStatus.includes('B') && !latestStatus.includes('C') && !latestStatus.includes('不明')) {
    reasons.push(`最新状況がA/B/C/不明を含まない（${latestStatus}）`);
  }
  if (!desiredArea && !desiredPropertyType) reasons.push('希望エリアと希望種別が両方空欄');
  if (inquirySource.includes('業者問合せ') || distributionType.includes('業者問合せ')) reasons.push('業者問合せ');

  if (reasons.length > 0) {
    console.log('買主6941が買主候補に含まれない理由:');
    reasons.forEach((reason, index) => {
      console.log(`  ${index + 1}. ${reason}`);
    });
  } else {
    console.log('買主6941は基本条件を満たしています。');
    console.log('エリア・種別・価格帯のマッチングで除外されている可能性があります。');
  }
}

checkBuyer6941().catch(console.error);
