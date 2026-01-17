import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkMatch() {
  console.log('=== AA4160と買主1811のマッチング確認 ===\n');

  // 物件AA4160の情報
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA4160')
    .single();

  if (propError) {
    console.log('❌ 物件AA4160が見つかりません:', propError.message);
    return;
  }

  console.log('【物件AA4160】');
  console.log(`住所: ${property.address}`);
  console.log(`配信エリア: ${property.distribution_areas || 'なし'}`);
  console.log(`物件タイプ: ${property.property_type || 'なし'}`);
  console.log(`土地面積: ${property.land_area || 'なし'}㎡`);
  console.log(`価格: ${property.price ? property.price.toLocaleString() : 'なし'}円`);

  // 買主1811の情報
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1811')
    .single();

  if (buyerError) {
    console.log('\n❌ 買主1811が見つかりません:', buyerError.message);
    return;
  }

  console.log('\n【買主1811】');
  console.log(`メール: ${buyer.email}`);
  console.log(`名前: ${buyer.name}`);
  console.log(`希望エリア: ${buyer.desired_area || 'なし'}`);
  console.log(`希望物件タイプ: ${buyer.desired_property_type || 'なし'}`);
  console.log(`配信タイプ: ${buyer.distribution_type || 'なし'}`);
  console.log(`Pinrich: ${buyer.pinrich || 'なし'}`);
  console.log(`ステータス: ${buyer.latest_status || 'なし'}`);
  console.log(`予算（戸建）: ${buyer.price_range_house || 'なし'}`);

  // エリアマッチング判定
  console.log('\n【エリアマッチング判定】');
  const propertyAreas = property.distribution_areas || '';
  const buyerAreas = buyer.desired_area || '';

  console.log(`物件の配信エリア: ${propertyAreas}`);
  console.log(`買主の希望エリア: ${buyerAreas}`);

  // 共通エリアを探す
  const propertyAreaSet = new Set(propertyAreas.split(''));
  const buyerAreaSet = new Set(buyerAreas.split(''));
  const commonAreas = [...propertyAreaSet].filter((area): area is string => 
    typeof area === 'string' && buyerAreaSet.has(area) && area.trim() !== ''
  );

  if (commonAreas.length > 0) {
    console.log(`✅ 共通エリア: ${commonAreas.join(', ')}`);
    console.log('→ エリアマッチング: OK');
  } else {
    console.log('❌ 共通エリアなし');
    console.log('→ エリアマッチング: NG（配信対象外）');
  }

  // その他の条件チェック
  console.log('\n【その他の条件チェック】');
  console.log(`配信タイプ: ${buyer.distribution_type === '要' ? '✅ 要' : '❌ 不要'}`);
  console.log(`ステータス: ${buyer.latest_status === 'C' ? '✅ C（配信可能）' : `❌ ${buyer.latest_status}`}`);
  console.log(`Pinrich: ${buyer.pinrich === '配信中' ? '✅ 配信中' : `❌ ${buyer.pinrich}`}`);

  // 最終判定
  console.log('\n【最終判定】');
  if (commonAreas.length === 0) {
    console.log('❌ 配信対象外');
    console.log('理由: 物件の配信エリアと買主の希望エリアに共通エリアがありません');
  } else if (buyer.distribution_type !== '要') {
    console.log('❌ 配信対象外');
    console.log('理由: 配信タイプが「不要」に設定されています');
  } else if (buyer.latest_status === 'D') {
    console.log('❌ 配信対象外');
    console.log('理由: ステータスがD（配信・追客不要案件）です');
  } else {
    console.log('✅ 配信対象');
  }
}

checkMatch().catch(console.error);
