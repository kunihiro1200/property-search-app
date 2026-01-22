import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function findQualifiedBuyers() {
  console.log('=== AA13129に配信されるべき買主を検索 ===\n');

  // 1. AA13129の物件情報
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .single();

  if (propertyError) {
    console.error('物件取得エラー:', propertyError);
    return;
  }

  console.log('物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  物件種別:', property.property_type);
  console.log('  価格:', property.price?.toLocaleString(), '円');
  console.log('  配信エリア:', property.distribution_areas);
  console.log('');

  // 2. 配信エリア㊵の買主を検索
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('*')
    .not('email', 'is', null)
    .neq('email', '');

  if (buyersError) {
    console.error('買主取得エラー:', buyersError);
    return;
  }

  console.log(`総買主数: ${buyers.length}\n`);

  // 3. フィルター条件をチェック
  const qualifiedBuyers = [];

  for (const buyer of buyers) {
    // 配信フラグ
    const distributionType = buyer.distribution_type?.trim() || '';
    if (distributionType !== '要' && distributionType !== 'mail' && !distributionType.includes('LINE→mail')) continue;

    // ステータス
    const status = buyer.latest_status || '';
    if (status.includes('買付') || status.includes('D')) continue;

    // エリアマッチング
    const buyerAreas = extractAreaNumbers(buyer.desired_area);
    const propertyAreas = extractAreaNumbers(property.distribution_areas);
    const matchedAreas = buyerAreas.filter(area => propertyAreas.includes(area));
    
    if (matchedAreas.length === 0) continue;

    // 物件種別チェック
    if (buyer.desired_property_type && buyer.desired_property_type.trim() !== '') {
      const desiredType = buyer.desired_property_type.trim();
      const actualType = property.property_type?.trim() || '';
      
      if (!checkPropertyTypeMatch(desiredType, actualType)) {
        console.log(`買主${buyer.buyer_number}: 物件種別不一致 (希望: ${desiredType}, 物件: ${actualType})`);
        continue;
      }
    }

    // 価格帯チェック
    let priceRangeText = '';
    if (property.property_type === 'マンション' || property.property_type === 'アパート') {
      priceRangeText = buyer.price_range_apartment || '';
    } else if (property.property_type === '戸建' || property.property_type === '戸建て') {
      priceRangeText = buyer.price_range_house || '';
    } else if (property.property_type === '土地') {
      priceRangeText = buyer.price_range_land || '';
    }

    let priceMatch = true;
    if (property.price && priceRangeText && !priceRangeText.includes('指定なし') && priceRangeText.trim() !== '') {
      const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
      if (minOnlyMatch) {
        const minPrice = parseInt(minOnlyMatch[1]) * 10000;
        priceMatch = property.price >= minPrice;
      } else {
        const maxOnlyMatch = priceRangeText.match(/(?:~|～)?(\d+)万円(?:以下)?$/);
        if (maxOnlyMatch && !priceRangeText.includes('以上') && !priceRangeText.includes('～') && !priceRangeText.match(/(\d+)万円～(\d+)万円/)) {
          const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
          priceMatch = property.price <= maxPrice;
        } else {
          const rangeMatch = priceRangeText.match(/(\d+)(?:万円)?[～~](\d+)万円/);
          if (rangeMatch) {
            const minPrice = parseInt(rangeMatch[1]) * 10000;
            const maxPrice = parseInt(rangeMatch[2]) * 10000;
            priceMatch = property.price >= minPrice && property.price <= maxPrice;
          } else {
            console.log(`買主${buyer.buyer_number}: 価格帯解析不可 (${priceRangeText})`);
            continue;
          }
        }
      }
    }

    if (!priceMatch) {
      console.log(`買主${buyer.buyer_number}: 価格帯不一致 (希望: ${priceRangeText}, 物件: ${property.price?.toLocaleString()}円)`);
      continue;
    }

    qualifiedBuyers.push({
      buyer_number: buyer.buyer_number,
      email: buyer.email,
      desired_area: buyer.desired_area,
      desired_property_type: buyer.desired_property_type,
      price_range: priceRangeText || '指定なし',
      matched_areas: matchedAreas
    });
  }

  console.log(`\n配信対象買主: ${qualifiedBuyers.length}件\n`);

  if (qualifiedBuyers.length > 0) {
    qualifiedBuyers.forEach((buyer, index) => {
      console.log(`${index + 1}. 買主${buyer.buyer_number}`);
      console.log(`   メール: ${buyer.email}`);
      console.log(`   希望物件種別: ${buyer.desired_property_type || '指定なし'}`);
      console.log(`   価格帯: ${buyer.price_range}`);
      console.log(`   マッチエリア: ${buyer.matched_areas.join(', ')}`);
      console.log('');
    });
  } else {
    console.log('配信対象の買主が見つかりませんでした。');
    console.log('\n原因を調査します...\n');

    // エリア㊵を希望している買主を確認
    const area35Buyers = buyers.filter(b => {
      const areas = extractAreaNumbers(b.desired_area);
      return areas.includes('㊵');
    });

    console.log(`エリア㊵を希望している買主: ${area35Buyers.length}件`);

    if (area35Buyers.length > 0) {
      console.log('\nエリア㊵を希望している買主の詳細:');
      area35Buyers.slice(0, 10).forEach((buyer, index) => {
        console.log(`${index + 1}. 買主${buyer.buyer_number}`);
        console.log(`   配信: ${buyer.distribution_type}`);
        console.log(`   ステータス: ${buyer.latest_status}`);
        console.log(`   希望物件種別: ${buyer.desired_property_type || '指定なし'}`);
        console.log(`   価格帯（戸建）: ${buyer.price_range_house || '指定なし'}`);
        console.log('');
      });
    }
  }
}

function extractAreaNumbers(areaText: string | null | undefined): string[] {
  if (!areaText) return [];
  const matches = areaText.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿]/g);
  return matches || [];
}

function checkPropertyTypeMatch(desiredType: string, actualType: string): boolean {
  const normalizedActual = actualType.toLowerCase().trim();

  // Split desired types by common separators
  const desiredTypes = desiredType.split(/[、・\/,]/).map(t => t.toLowerCase().trim()).filter(t => t);

  for (const desired of desiredTypes) {
    if (desired === normalizedActual) {
      return true;
    }

    if ((desired === 'マンション' || desired === 'アパート') &&
        (normalizedActual === 'マンション' || normalizedActual === 'アパート')) {
      return true;
    }

    if ((desired === '戸建' || desired === '戸建て') &&
        (normalizedActual === '戸建' || normalizedActual === '戸建て')) {
      return true;
    }
  }

  return false;
}

findQualifiedBuyers().catch(console.error);
