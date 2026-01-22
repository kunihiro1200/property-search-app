import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA4160Buyer2064() {
  console.log('=== AA4160と買主1811 (kouten0909@icloud.com) の調査 ===\n');

  // 1. 物件AA4160の情報を取得
  console.log('1. 物件AA4160の情報:');
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA4160')
    .single();

  if (propError) {
    console.error('物件取得エラー:', propError);
    return;
  }

  console.log('物件番号:', property.property_number);
  console.log('住所:', property.address);
  console.log('配信エリア:', property.distribution_areas);
  console.log('物件タイプ:', property.property_type);
  console.log('土地面積:', property.land_area);
  console.log('建物面積:', property.building_area);
  console.log('価格:', property.price);
  console.log('専任:', property.single_listing);
  console.log('ステータス:', property.status);
  console.log('');

  // 2. 買主1811の情報を取得
  console.log('2. 買主1811 (kouten0909@icloud.com) の情報:');
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1811')
    .single();

  if (buyerError) {
    console.error('買主取得エラー:', buyerError);
    return;
  }

  console.log('買主番号:', buyer.buyer_number);
  console.log('メール:', buyer.email);
  console.log('配信エリア:', buyer.distribution_areas);
  console.log('物件タイプ:', buyer.property_type);
  console.log('土地面積 最小:', buyer.land_area_min);
  console.log('土地面積 最大:', buyer.land_area_max);
  console.log('建物面積 最小:', buyer.building_area_min);
  console.log('建物面積 最大:', buyer.building_area_max);
  console.log('予算 最小:', buyer.budget_min);
  console.log('予算 最大:', buyer.budget_max);
  console.log('専任のみ:', buyer.exclusive_only);
  console.log('配信停止:', buyer.distribution_stopped);
  console.log('');

  // 3. フィルタリング条件のチェック
  console.log('3. フィルタリング条件のチェック:');
  
  // 配信停止チェック
  const distributionStoppedCheck = !buyer.distribution_stopped;
  console.log(`✓ 配信停止チェック: ${distributionStoppedCheck} (distribution_stopped: ${buyer.distribution_stopped})`);

  // 配信エリアチェック
  const propertyAreas = Array.isArray(property.distribution_areas) ? property.distribution_areas : [];
  const buyerAreas = Array.isArray(buyer.distribution_areas) ? buyer.distribution_areas : [];
  const areaMatch = propertyAreas.length > 0 && buyerAreas.length > 0 && propertyAreas.some((area: number) => buyerAreas.includes(area));
  console.log(`✓ 配信エリアチェック: ${areaMatch}`);
  console.log(`  物件エリア: [${propertyAreas.join(', ')}]`);
  console.log(`  買主エリア: [${buyerAreas.join(', ')}]`);
  console.log(`  共通エリア: [${propertyAreas.filter((a: number) => buyerAreas.includes(a)).join(', ')}]`);

  // 物件タイプチェック
  const propertyTypeMatch = !buyer.property_type || buyer.property_type === property.property_type;
  console.log(`✓ 物件タイプチェック: ${propertyTypeMatch}`);
  console.log(`  物件: ${property.property_type}, 買主: ${buyer.property_type || '指定なし'}`);

  // 土地面積チェック
  let landAreaMatch = true;
  if (property.land_area) {
    if (buyer.land_area_min && property.land_area < buyer.land_area_min) {
      landAreaMatch = false;
    }
    if (buyer.land_area_max && property.land_area > buyer.land_area_max) {
      landAreaMatch = false;
    }
  }
  console.log(`✓ 土地面積チェック: ${landAreaMatch}`);
  console.log(`  物件: ${property.land_area || 'なし'}, 買主範囲: ${buyer.land_area_min || '下限なし'} - ${buyer.land_area_max || '上限なし'}`);

  // 建物面積チェック
  let buildingAreaMatch = true;
  if (property.building_area) {
    if (buyer.building_area_min && property.building_area < buyer.building_area_min) {
      buildingAreaMatch = false;
    }
    if (buyer.building_area_max && property.building_area > buyer.building_area_max) {
      buildingAreaMatch = false;
    }
  }
  console.log(`✓ 建物面積チェック: ${buildingAreaMatch}`);
  console.log(`  物件: ${property.building_area || 'なし'}, 買主範囲: ${buyer.building_area_min || '下限なし'} - ${buyer.building_area_max || '上限なし'}`);

  // 予算チェック
  let budgetMatch = true;
  if (property.price) {
    if (buyer.budget_min && property.price < buyer.budget_min) {
      budgetMatch = false;
    }
    if (buyer.budget_max && property.price > buyer.budget_max) {
      budgetMatch = false;
    }
  }
  console.log(`✓ 予算チェック: ${budgetMatch}`);
  console.log(`  物件価格: ${property.price || 'なし'}, 買主予算: ${buyer.budget_min || '下限なし'} - ${buyer.budget_max || '上限なし'}`);

  // 専任チェック
  const exclusiveMatch = !buyer.exclusive_only || property.single_listing === 'Y';
  console.log(`✓ 専任チェック: ${exclusiveMatch}`);
  console.log(`  物件専任: ${property.single_listing}, 買主専任のみ: ${buyer.exclusive_only}`);

  console.log('');
  console.log('4. 総合判定:');
  const allMatch = distributionStoppedCheck && areaMatch && propertyTypeMatch && 
                   landAreaMatch && buildingAreaMatch && budgetMatch && exclusiveMatch;
  
  if (allMatch) {
    console.log('✅ すべての条件を満たしています - 配信対象になるはずです');
  } else {
    console.log('❌ 以下の条件で不一致があります:');
    if (!distributionStoppedCheck) console.log('  - 配信停止');
    if (!areaMatch) console.log('  - 配信エリア');
    if (!propertyTypeMatch) console.log('  - 物件タイプ');
    if (!landAreaMatch) console.log('  - 土地面積');
    if (!buildingAreaMatch) console.log('  - 建物面積');
    if (!budgetMatch) console.log('  - 予算');
    if (!exclusiveMatch) console.log('  - 専任');
  }

  // 5. 実際のAPIでのフィルタリング結果を確認
  console.log('\n5. 実際のAPIフィルタリング結果:');
  const { data: filteredBuyers, error: filterError } = await supabase
    .rpc('get_qualified_buyers_for_property', {
      p_property_number: 'AA4160'
    });

  if (filterError) {
    console.error('フィルタリングエラー:', filterError);
  } else {
    const buyer1811Included = filteredBuyers?.some((b: any) => b.buyer_number === '1811' || b.buyer_number === 1811);
    console.log(`買主1811は結果に含まれている: ${buyer1811Included ? 'はい' : 'いいえ'}`);
    console.log(`総配信対象買主数: ${filteredBuyers?.length || 0}`);
    
    if (!buyer1811Included && filteredBuyers) {
      // 買主1811と似た条件の買主を探す
      const similarBuyers = filteredBuyers.filter((b: any) => {
        const bAreas = b.distribution_areas || [];
        return bAreas.some((a: number) => buyerAreas.includes(a));
      });
      console.log(`\n同じエリアを持つ配信対象買主: ${similarBuyers.length}人`);
      if (similarBuyers.length > 0) {
        console.log('例:');
        similarBuyers.slice(0, 3).forEach((b: any) => {
          console.log(`  買主${b.buyer_number}: エリア[${(b.distribution_areas || []).join(', ')}], タイプ: ${b.property_type || '指定なし'}`);
        });
      }
    }
  }
}

checkAA4160Buyer2064().catch(console.error);
