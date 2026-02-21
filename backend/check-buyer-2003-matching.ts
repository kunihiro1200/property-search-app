import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer2003Matching() {
  console.log('=== 買主2003とAA13249のマッチング確認 ===\n');

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
  console.log('  配信エリア:', property.distribution_areas);
  console.log('  住所:', property.address);

  // 2. 買主2003の情報を取得
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '2003')
    .single();

  if (buyerError || !buyer) {
    console.error('買主2003が見つかりません:', buyerError);
    return;
  }

  console.log('\n買主2003の情報:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  希望エリア:', buyer.desired_area);
  console.log('  希望種別:', buyer.desired_property_type);
  console.log('  希望価格（マンション）:', buyer.price_range_apartment);
  console.log('  希望価格（戸建て）:', buyer.price_range_house);
  console.log('  希望価格（土地）:', buyer.price_range_land);

  // 3. マッチング条件をチェック
  console.log('\n=== マッチング条件チェック ===\n');

  // 3-1. エリアマッチング
  console.log('1. エリアマッチング:');
  const propertyAreaNumbers = extractAreaNumbers(property.distribution_areas || '');
  const buyerAreaNumbers = extractAreaNumbers(buyer.desired_area || '');
  
  console.log('   物件のエリア番号:', propertyAreaNumbers.join(', ') || '（なし）');
  console.log('   買主の希望エリア番号:', buyerAreaNumbers.join(', ') || '（なし）');
  
  const areaMatch = propertyAreaNumbers.some(area => buyerAreaNumbers.includes(area));
  if (areaMatch) {
    console.log('   ✅ エリアマッチ: 一致するエリアがあります');
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
  
  const typeMatch = normalizedPropertyType === normalizedDesiredType || 
                    normalizedPropertyType.includes(normalizedDesiredType) ||
                    normalizedDesiredType.includes(normalizedPropertyType);
  
  if (typeMatch) {
    console.log('   ✅ 種別マッチ: 一致します');
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

  if (!priceRange || !priceRange.trim()) {
    console.log('   ✅ 価格帯マッチ: 希望価格帯が指定されていないため、全ての価格が対象');
  } else {
    const { min, max } = parsePriceRange(priceRange);
    console.log('   解析後の価格帯:', min.toLocaleString(), '円 ～', max.toLocaleString(), '円');
    
    const priceMatch = property.sales_price >= min && property.sales_price <= max;
    if (priceMatch) {
      console.log('   ✅ 価格帯マッチ: 範囲内です');
    } else {
      console.log('   ❌ 価格帯マッチ: 範囲外です');
    }
  }

  // 4. 結論
  console.log('\n=== 結論 ===\n');
  if (!areaMatch) {
    console.log('買主2003が買主候補に含まれない理由: エリアが一致しません');
  } else if (!typeMatch) {
    console.log('買主2003が買主候補に含まれない理由: 種別が一致しません');
  } else if (priceRange && priceRange.trim()) {
    const { min, max } = parsePriceRange(priceRange);
    const priceMatch = property.sales_price >= min && property.sales_price <= max;
    if (!priceMatch) {
      console.log('買主2003が買主候補に含まれない理由: 価格帯が一致しません');
    } else {
      console.log('買主2003は全ての条件を満たしています。買主候補に含まれるはずです。');
    }
  } else {
    console.log('買主2003は全ての条件を満たしています。買主候補に含まれるはずです。');
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

checkBuyer2003Matching().catch(console.error);
