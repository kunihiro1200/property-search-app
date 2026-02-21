import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer1553Matching() {
  console.log('=== 買主1553とAA13249のマッチング確認 ===\n');

  // 1. 物件AA13249の情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13249')
    .single();

  if (propertyError || !property) {
    console.error('物件AA13249が見つかりません:', propertyError);
    return;
  }

  console.log('物件AA13249の情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  種別:', property.property_type);
  console.log('  価格:', property.sales_price?.toLocaleString(), '円');
  console.log('  配信エリア:', property.distribution_areas || '（未設定）');
  console.log('  住所:', property.address);

  // 2. 買主1553の情報を取得
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1553')
    .single();

  if (buyerError || !buyer) {
    console.error('買主1553が見つかりません:', buyerError);
    return;
  }

  console.log('\n買主1553の情報:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  削除済み:', buyer.deleted_at);
  console.log('  配信種別:', buyer.distribution_type);
  console.log('  最新状況:', buyer.latest_status);
  console.log('  希望エリア:', buyer.desired_area);
  console.log('  希望種別:', buyer.desired_property_type);
  console.log('  希望価格（マンション）:', buyer.price_range_apartment);
  console.log('  希望価格（戸建て）:', buyer.price_range_house);
  console.log('  希望価格（土地）:', buyer.price_range_land);
  console.log('  問合せ元:', buyer.inquiry_source);
  console.log('  業者問合せフラグ:', buyer.broker_inquiry);

  // 3. マッチング条件をチェック
  console.log('\n=== マッチング条件チェック ===\n');

  // 3-0. 基本条件チェック
  console.log('0. 基本条件:');
  
  // 削除済みチェック
  if (buyer.deleted_at) {
    console.log('   ❌ 削除済み:', buyer.deleted_at);
    console.log('   → 買主候補から除外されます');
    return;
  } else {
    console.log('   ✅ 削除済みではない');
  }

  // 配信種別チェック
  const distributionType = (buyer.distribution_type || '').trim();
  if (distributionType !== '要') {
    console.log('   ❌ 配信種別:', distributionType, '（「要」ではない）');
    console.log('   → 買主候補から除外されます');
    return;
  } else {
    console.log('   ✅ 配信種別: 要');
  }

  // 最新状況チェック
  const latestStatus = (buyer.latest_status || '').trim();
  const statusMatch = latestStatus.includes('A') || 
                      latestStatus.includes('B') || 
                      latestStatus.includes('C') || 
                      latestStatus.includes('不明');
  if (!statusMatch) {
    console.log('   ❌ 最新状況:', latestStatus, '（A/B/C/不明を含まない）');
    console.log('   → 買主候補から除外されます');
    return;
  } else {
    console.log('   ✅ 最新状況:', latestStatus);
  }

  // 希望エリア・希望種別チェック
  const desiredArea = (buyer.desired_area || '').trim();
  const desiredPropertyType = (buyer.desired_property_type || '').trim();
  if (!desiredArea && !desiredPropertyType) {
    console.log('   ❌ 希望エリアと希望種別が両方空欄');
    console.log('   → 買主候補から除外されます');
    return;
  } else {
    console.log('   ✅ 希望エリアまたは希望種別が入力されている');
  }

  // 業者問合せチェック
  const inquirySource = (buyer.inquiry_source || '').trim();
  const brokerInquiry = (buyer.broker_inquiry || '').trim();
  const isBusinessInquiry = 
    inquirySource === '業者問合せ' || 
    inquirySource.includes('業者') ||
    distributionType === '業者問合せ' ||
    distributionType.includes('業者') ||
    (brokerInquiry && brokerInquiry !== '' && brokerInquiry !== '0' && brokerInquiry.toLowerCase() !== 'false');
  
  if (isBusinessInquiry) {
    console.log('   ❌ 業者問合せ');
    console.log('   → 買主候補から除外されます');
    return;
  } else {
    console.log('   ✅ 業者問合せではない');
  }

  // 3-1. エリアマッチング
  console.log('\n1. エリアマッチング:');
  const propertyAreaNumbers = extractAreaNumbers('㊶'); // 別府市
  const buyerAreaNumbers = extractAreaNumbers(buyer.desired_area || '');
  
  console.log('   物件のエリア番号:', propertyAreaNumbers.join(', ') || '（なし）');
  console.log('   買主の希望エリア番号:', buyerAreaNumbers.join(', ') || '（なし）');
  
  let areaMatch = false;
  if (!desiredArea) {
    console.log('   ✅ エリアマッチ: 希望エリアが空欄のため、全てのエリアが対象');
    areaMatch = true;
  } else if (propertyAreaNumbers.some(area => buyerAreaNumbers.includes(area))) {
    console.log('   ✅ エリアマッチ: 一致するエリアがあります');
    areaMatch = true;
  } else {
    console.log('   ❌ エリアマッチ: 一致するエリアがありません');
  }

  // 3-2. 種別マッチング
  console.log('\n2. 種別マッチング:');
  console.log('   物件種別:', property.property_type);
  console.log('   買主希望種別:', buyer.desired_property_type);
  
  const normalizedPropertyType = normalizePropertyType(property.property_type || '');
  const normalizedDesiredType = normalizePropertyType(buyer.desired_property_type || '');
  
  console.log('   正規化後 - 物件:', normalizedPropertyType);
  console.log('   正規化後 - 買主:', normalizedDesiredType);
  
  let typeMatch = false;
  if (desiredPropertyType === '指定なし') {
    console.log('   ✅ 種別マッチ: 希望種別が「指定なし」のため、全ての種別が対象');
    typeMatch = true;
  } else if (!desiredPropertyType) {
    console.log('   ❌ 種別マッチ: 希望種別が空欄（除外）');
  } else if (normalizedPropertyType === normalizedDesiredType || 
             normalizedPropertyType.includes(normalizedDesiredType) ||
             normalizedDesiredType.includes(normalizedPropertyType)) {
    console.log('   ✅ 種別マッチ: 一致します');
    typeMatch = true;
  } else {
    console.log('   ❌ 種別マッチ: 一致しません');
  }

  // 3-3. 価格帯マッチング
  console.log('\n3. 価格帯マッチング:');
  console.log('   物件価格:', property.sales_price?.toLocaleString(), '円');
  
  let priceRange: string | null = null;
  if (normalizedPropertyType === 'マンション' || normalizedPropertyType.includes('マンション')) {
    priceRange = buyer.price_range_apartment;
    console.log('   買主希望価格帯（マンション）:', priceRange || '（指定なし）');
  } else if (normalizedPropertyType === '戸建' || normalizedPropertyType.includes('戸建')) {
    priceRange = buyer.price_range_house;
    console.log('   買主希望価格帯（戸建て）:', priceRange || '（指定なし）');
  } else if (normalizedPropertyType === '土地' || normalizedPropertyType.includes('土地')) {
    priceRange = buyer.price_range_land;
    console.log('   買主希望価格帯（土地）:', priceRange || '（指定なし）');
  }

  let priceMatch = false;
  if (!priceRange || !priceRange.trim()) {
    console.log('   ✅ 価格帯マッチ: 希望価格帯が指定されていないため、全ての価格が対象');
    priceMatch = true;
  } else {
    const { min, max } = parsePriceRange(priceRange);
    console.log('   解析後の価格帯:', min.toLocaleString(), '円 ～', max.toLocaleString(), '円');
    
    if (property.sales_price >= min && property.sales_price <= max) {
      console.log('   ✅ 価格帯マッチ: 範囲内です');
      priceMatch = true;
    } else {
      console.log('   ❌ 価格帯マッチ: 範囲外です');
    }
  }

  // 4. 結論
  console.log('\n=== 結論 ===\n');
  if (!areaMatch) {
    console.log('買主1553が買主候補に含まれない理由: エリアが一致しません');
  } else if (!typeMatch) {
    console.log('買主1553が買主候補に含まれない理由: 種別が一致しません');
  } else if (!priceMatch) {
    console.log('買主1553が買主候補に含まれない理由: 価格帯が一致しません');
  } else {
    console.log('買主1553は全ての条件を満たしています。買主候補に含まれるはずです。');
  }
}

function extractAreaNumbers(areaString: string): string[] {
  const circledNumbers = areaString.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g) || [];
  return circledNumbers;
}

function normalizePropertyType(type: string): string {
  const normalized = type.trim()
    .replace(/中古/g, '')
    .replace(/新築/g, '')
    .replace(/一戸建て/g, '戸建')
    .replace(/一戸建/g, '戸建')
    .replace(/戸建て/g, '戸建')
    .replace(/分譲/g, '')
    .trim();
  return normalized;
}

function parsePriceRange(priceRange: string): { min: number; max: number } {
  let min = 0;
  let max = Number.MAX_SAFE_INTEGER;

  const cleanedRange = priceRange
    .replace(/,/g, '')
    .replace(/円/g, '')
    .replace(/万/g, '0000')
    .replace(/億/g, '00000000')
    .trim();

  const rangeMatch = cleanedRange.match(/(\d+)?\s*[〜～\-]\s*(\d+)?/);
  if (rangeMatch) {
    if (rangeMatch[1]) {
      min = parseInt(rangeMatch[1], 10);
    }
    if (rangeMatch[2]) {
      max = parseInt(rangeMatch[2], 10);
    }
    return { min, max };
  }

  const aboveMatch = cleanedRange.match(/(\d+)\s*以上/);
  if (aboveMatch) {
    min = parseInt(aboveMatch[1], 10);
    return { min, max };
  }

  const belowMatch = cleanedRange.match(/(\d+)\s*以下/);
  if (belowMatch) {
    max = parseInt(belowMatch[1], 10);
    return { min, max };
  }

  const singleMatch = cleanedRange.match(/^(\d+)$/);
  if (singleMatch) {
    const value = parseInt(singleMatch[1], 10);
    min = value * 0.8;
    max = value * 1.2;
    return { min, max };
  }

  return { min, max };
}

checkBuyer1553Matching().catch(console.error);
