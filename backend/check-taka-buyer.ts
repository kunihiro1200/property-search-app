import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTakaBuyer() {
  console.log('=== taka844452@icloud.comの買主情報 ===\n');

  // taka844452@icloud.comの買主を検索
  const { data: buyers, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .ilike('email', '%taka844452@icloud.com%');

  if (buyerError) {
    console.error('買主取得エラー:', buyerError);
    return;
  }

  if (!buyers || buyers.length === 0) {
    console.log('該当する買主が見つかりません');
    return;
  }

  console.log(`見つかった買主: ${buyers.length}件\n`);

  for (const buyer of buyers) {
    console.log('買主情報:');
    console.log('  買主番号:', buyer.buyer_number);
    console.log('  メールアドレス:', buyer.email);
    console.log('  希望エリア:', buyer.desired_area);
    console.log('  配信:', buyer.distribution_type);
    console.log('  最新ステータス:', buyer.latest_status);
    console.log('  希望物件種別:', buyer.desired_property_type);
    console.log('  価格帯（マンション）:', buyer.price_range_apartment);
    console.log('  価格帯（戸建）:', buyer.price_range_house);
    console.log('  価格帯（土地）:', buyer.price_range_land);
    console.log('');

    // AA13129との配信条件チェック
    console.log('AA13129との配信条件チェック:');
    
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA13129')
      .single();

    if (propertyError) {
      console.error('物件取得エラー:', propertyError);
      continue;
    }

    console.log('  物件種別:', property.property_type);
    console.log('  物件価格:', property.price?.toLocaleString(), '円');
    console.log('  物件配信エリア:', property.distribution_areas);
    console.log('');

    // 配信フラグ
    const distributionMatch = buyer.distribution_type?.trim() === '要';
    console.log(`  ✓ 配信フラグ: ${distributionMatch ? '合格' : '不合格'} (${buyer.distribution_type})`);

    // ステータス
    const status = buyer.latest_status || '';
    const statusMatch = !status.includes('買付') && !status.includes('D');
    console.log(`  ✓ ステータス: ${statusMatch ? '合格' : '不合格'} (${buyer.latest_status})`);

    // エリアマッチング
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

    // 価格帯マッチング
    let priceMatch = true;
    let priceRangeText = '';
    if (property.property_type === 'マンション' || property.property_type === 'アパート') {
      priceRangeText = buyer.price_range_apartment || '';
    } else if (property.property_type === '戸建' || property.property_type === '戸建て') {
      priceRangeText = buyer.price_range_house || '';
    } else if (property.property_type === '土地') {
      priceRangeText = buyer.price_range_land || '';
    }

    // Check property type match first
    if (buyer.desired_property_type && buyer.desired_property_type.trim() !== '') {
      const desiredType = buyer.desired_property_type.trim();
      const actualType = property.property_type?.trim() || '';
      
      const typeMatch = checkPropertyTypeMatch(desiredType, actualType);
      
      if (!typeMatch) {
        priceMatch = false;
        console.log(`  ✓ 価格帯: 不合格 (物件種別不一致)`);
        console.log(`    - 買主の希望物件種別: ${desiredType}`);
        console.log(`    - 物件の種別: ${actualType}`);
      }
    }

    if (priceMatch && property.price && priceRangeText && !priceRangeText.includes('指定なし')) {
      const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
      if (minOnlyMatch) {
        const minPrice = parseInt(minOnlyMatch[1]) * 10000;
        priceMatch = property.price >= minPrice;
        console.log(`  ✓ 価格帯: ${priceMatch ? '合格' : '不合格'}`);
        console.log(`    - 物件価格: ${property.price.toLocaleString()}円`);
        console.log(`    - 買主の希望価格帯: ${priceRangeText} (${minPrice.toLocaleString()}円以上)`);
      } else {
        const maxOnlyMatch = priceRangeText.match(/(\d+)万円以下/);
        if (maxOnlyMatch) {
          const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
          priceMatch = property.price <= maxPrice;
          console.log(`  ✓ 価格帯: ${priceMatch ? '合格' : '不合格'}`);
          console.log(`    - 物件価格: ${property.price.toLocaleString()}円`);
          console.log(`    - 買主の希望価格帯: ${priceRangeText} (${maxPrice.toLocaleString()}円以下)`);
        } else {
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
            console.log(`  ✓ 価格帯: 不合格 (価格帯の解析不可)`);
          }
        }
      }
    } else {
      console.log(`  ✓ 価格帯: 合格 (価格情報なしまたは指定なし)`);
    }

    console.log('');
    console.log('総合判定:');
    const allMatch = distributionMatch && statusMatch && areaMatch && priceMatch;
    console.log(`  ${allMatch ? '✓ 配信対象' : '✗ 配信対象外'}`);
    
    if (!allMatch) {
      console.log('  不合格の理由:');
      if (!distributionMatch) console.log('    - 配信フラグが「要」ではない');
      if (!statusMatch) console.log('    - ステータスに「買付」または「D」が含まれる');
      if (!areaMatch) console.log('    - エリアがマッチしない');
      if (!priceMatch) console.log('    - 価格帯がマッチしない');
    }
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

function extractAreaNumbers(areaText: string | null | undefined): string[] {
  if (!areaText) return [];
  const matches = areaText.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿]/g);
  return matches || [];
}

function checkPropertyTypeMatch(desiredType: string, actualType: string): boolean {
  const normalizedDesired = desiredType.toLowerCase().trim();
  const normalizedActual = actualType.toLowerCase().trim();

  if (normalizedDesired === normalizedActual) {
    return true;
  }

  if ((normalizedDesired === 'マンション' || normalizedDesired === 'アパート') &&
      (normalizedActual === 'マンション' || normalizedActual === 'アパート')) {
    return true;
  }

  if ((normalizedDesired === '戸建' || normalizedDesired === '戸建て') &&
      (normalizedActual === '戸建' || normalizedActual === '戸建て')) {
    return true;
  }

  return false;
}

checkTakaBuyer().catch(console.error);
