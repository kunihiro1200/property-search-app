import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer3212AndAA13129() {
  console.log('=== 買主3212とAA13129の配信条件チェック ===\n');

  // 1. 買主3212の情報を取得
  console.log('1. 買主3212の情報:');
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '3212')
    .single();

  if (buyerError) {
    console.error('買主取得エラー:', buyerError);
    return;
  }

  console.log('  買主番号:', buyer.buyer_number);
  console.log('  メールアドレス:', buyer.email);
  console.log('  ★エリア:', buyer.desired_area);
  console.log('  配信:', buyer.distribution_type);
  console.log('  最新ステータス:', buyer.latest_status);
  console.log('  希望物件種別:', buyer.desired_property_type);
  console.log('  価格帯（マンション）:', buyer.price_range_apartment);
  console.log('  価格帯（戸建）:', buyer.price_range_house);
  console.log('  価格帯（土地）:', buyer.price_range_land);
  console.log('');

  // 2. AA13129の物件情報を取得
  console.log('2. AA13129の物件情報:');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .single();

  if (propertyError) {
    console.error('物件取得エラー:', propertyError);
    return;
  }

  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  物件種別:', property.property_type);
  console.log('  価格:', property.price);
  console.log('  配信エリア:', property.distribution_areas);
  console.log('  Google Map URL:', property.google_map_url);
  console.log('');

  // 3. 買主3212の問い合わせ履歴を取得
  console.log('3. 買主3212の問い合わせ履歴:');
  const { data: inquiries, error: inquiriesError } = await supabase
    .from('buyer_inquiries')
    .select(`
      property_number,
      inquiry_date,
      property_listings!inner(
        property_number,
        address,
        google_map_url
      )
    `)
    .eq('buyer_id', buyer.id)
    .order('inquiry_date', { ascending: false });

  if (inquiriesError) {
    console.error('問い合わせ履歴取得エラー:', inquiriesError);
  } else if (inquiries && inquiries.length > 0) {
    console.log(`  問い合わせ件数: ${inquiries.length}件`);
    inquiries.forEach((inq: any, index: number) => {
      console.log(`  ${index + 1}. 物件番号: ${inq.property_number}`);
      console.log(`     住所: ${inq.property_listings?.address || 'N/A'}`);
      console.log(`     問い合わせ日: ${inq.inquiry_date}`);
    });
  } else {
    console.log('  問い合わせ履歴なし');
  }
  console.log('');

  // 4. フィルター条件の判定
  console.log('4. フィルター条件の判定:');
  
  // 4.1 配信フラグ
  const distributionMatch = buyer.distribution_type?.trim() === '要';
  console.log(`  ✓ 配信フラグ: ${distributionMatch ? '合格' : '不合格'} (${buyer.distribution_type})`);

  // 4.2 ステータス
  const status = buyer.latest_status || '';
  const statusMatch = !status.includes('買付') && !status.includes('D');
  console.log(`  ✓ ステータス: ${statusMatch ? '合格' : '不合格'} (${buyer.latest_status})`);

  // 4.3 エリアマッチング
  const buyerAreas = extractAreaNumbers(buyer.desired_area);
  const propertyAreas = extractAreaNumbers(property.distribution_areas);
  const matchedAreas = buyerAreas.filter(area => propertyAreas.includes(area));
  const areaMatch = matchedAreas.length > 0;
  console.log(`  ✓ エリアマッチング: ${areaMatch ? '合格' : '不合格'}`);
  console.log(`    - 買主のエリア番号: [${buyerAreas.join(', ')}]`);
  console.log(`    - 物件の配信エリア番号: [${propertyAreas.join(', ')}]`);
  if (matchedAreas.length > 0) {
    console.log(`    - マッチしたエリア: [${matchedAreas.join(', ')}]`);
  }

  // 4.4 価格帯マッチング
  let priceMatch = true;
  let priceRangeText = '';
  if (property.property_type === 'マンション' || property.property_type === 'アパート') {
    priceRangeText = buyer.price_range_apartment || '';
  } else if (property.property_type === '戸建' || property.property_type === '戸建て') {
    priceRangeText = buyer.price_range_house || '';
  } else if (property.property_type === '土地') {
    priceRangeText = buyer.price_range_land || '';
  }

  if (property.price && priceRangeText && !priceRangeText.includes('指定なし')) {
    // Try "X万円以上" format
    const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
    if (minOnlyMatch) {
      const minPrice = parseInt(minOnlyMatch[1]) * 10000;
      priceMatch = property.price >= minPrice;
      console.log(`  ✓ 価格帯: ${priceMatch ? '合格' : '不合格'}`);
      console.log(`    - 物件価格: ${property.price.toLocaleString()}円`);
      console.log(`    - 買主の希望価格帯: ${priceRangeText} (${minPrice.toLocaleString()}円以上)`);
    }
    // Try "X万円以下" format
    else {
      const maxOnlyMatch = priceRangeText.match(/(\d+)万円以下/);
      if (maxOnlyMatch) {
        const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
        priceMatch = property.price <= maxPrice;
        console.log(`  ✓ 価格帯: ${priceMatch ? '合格' : '不合格'}`);
        console.log(`    - 物件価格: ${property.price.toLocaleString()}円`);
        console.log(`    - 買主の希望価格帯: ${priceRangeText} (${maxPrice.toLocaleString()}円以下)`);
      }
      // Try "X万円～Y万円" format
      else {
        const rangeMatch = priceRangeText.match(/(\d+)万円～(\d+)万円/);
        if (rangeMatch) {
          const minPrice = parseInt(rangeMatch[1]) * 10000;
          const maxPrice = parseInt(rangeMatch[2]) * 10000;
          priceMatch = property.price >= minPrice && property.price <= maxPrice;
          console.log(`  ✓ 価格帯: ${priceMatch ? '合格' : '不合格'}`);
          console.log(`    - 物件価格: ${property.price.toLocaleString()}円`);
          console.log(`    - 買主の希望価格帯: ${priceRangeText} (${minPrice.toLocaleString()}円～${maxPrice.toLocaleString()}円)`);
        } else {
          priceMatch = false;
          console.log(`  ✓ 価格帯: 不合格 (価格帯の解析不可、除外)`);
          console.log(`    - 買主の希望価格帯: ${priceRangeText}`);
        }
      }
    }
  } else {
    console.log(`  ✓ 価格帯: 合格 (価格情報なしまたは指定なし)`);
  }

  console.log('');
  console.log('5. 総合判定:');
  const allMatch = distributionMatch && statusMatch && areaMatch && priceMatch;
  console.log(`  ${allMatch ? '✓ 配信対象' : '✗ 配信対象外'}`);
  
  if (!allMatch) {
    console.log('  不合格の理由:');
    if (!distributionMatch) console.log('    - 配信フラグが「要」ではない');
    if (!statusMatch) console.log('    - ステータスに「買付」または「D」が含まれる');
    if (!areaMatch) console.log('    - エリアがマッチしない');
    if (!priceMatch) console.log('    - 価格帯がマッチしない');
  }
}

function extractAreaNumbers(areaText: string | null | undefined): string[] {
  if (!areaText) return [];
  
  // Match circled numbers: ①-⑳ (1-20) and ㉑-㊿ (21-50)
  const matches = areaText.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿]/g);
  return matches || [];
}

checkBuyer3212AndAA13129().catch(console.error);
