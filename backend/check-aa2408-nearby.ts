import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkProperty() {
  // AA2408の物件情報を取得
  const { data: baseProperty, error } = await supabase
    .from('property_listings')
    .select('property_number, address, display_address, property_type, price, atbb_status')
    .eq('property_number', 'AA2408')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== AA2408 物件情報 ===');
  console.log('物件番号:', baseProperty.property_number);
  console.log('住所:', baseProperty.address);
  console.log('住居表示:', baseProperty.display_address);
  console.log('種別:', baseProperty.property_type);
  console.log('価格:', baseProperty.price?.toLocaleString(), '円');
  console.log('ステータス:', baseProperty.atbb_status);
  console.log('');

  // 近隣物件を検索（BuyerServiceと同じロジック）
  const address = baseProperty.address || '';
  const price = baseProperty.price || 0;
  const propertyType = baseProperty.property_type || '';

  // 価格帯を決定
  let minPrice = 0;
  let maxPrice = 0;
  if (price < 10000000) {
    minPrice = 0;
    maxPrice = 9999999;
  } else if (price < 30000000) {
    minPrice = 10000000;
    maxPrice = 29999999;
  } else if (price < 50000000) {
    minPrice = 30000000;
    maxPrice = 49999999;
  } else {
    minPrice = 50000000;
    maxPrice = 999999999;
  }

  // 市区町村と町名を抽出
  let city = '';
  let town = '';
  const cityMatch = address.match(/(大分市|別府市|由布市|日出町|杵築市|国東市|豊後高田市|宇佐市|中津市|日田市|竹田市|豊後大野市|臼杵市|津久見市|佐伯市)/);
  if (cityMatch) {
    city = cityMatch[1];
    
    // 市区町村の後の町名を抽出
    let afterCity = address.substring(address.indexOf(city) + city.length);
    
    // 「大字」を除外
    afterCity = afterCity.replace(/^大字/, '');
    
    // 町名を抽出（最初の漢字部分、「字」以降は除外）
    const townMatch = afterCity.match(/^([^\d\-\s]+)/);
    if (townMatch) {
      let extractedTown = townMatch[1];
      // 「字」以降を除外（例：「挾間町北方字和尚」→「挾間町北方」）
      const aざIndex = extractedTown.indexOf('字');
      if (aざIndex !== -1) {
        extractedTown = extractedTown.substring(0, aざIndex);
      }
      town = extractedTown;
    }
  }

  console.log('=== 検索条件 ===');
  console.log('市区町村:', city);
  console.log('町名:', town);
  console.log('価格帯:', minPrice.toLocaleString(), '～', maxPrice.toLocaleString(), '円');
  console.log('種別:', propertyType);
  const searchPattern = city && town ? `%${city}${town}%` : `%${city}%`;
  console.log('検索パターン:', searchPattern);
  console.log('');

  // 近隣物件を検索
  let query = supabase
    .from('property_listings')
    .select('property_number, address, display_address, property_type, price, atbb_status')
    .neq('property_number', 'AA2408')
    .gte('price', minPrice)
    .lte('price', maxPrice);

  if (propertyType) {
    query = query.eq('property_type', propertyType);
  }

  if (city && town) {
    query = query.ilike('address', `%${city}${town}%`);
  } else if (city) {
    query = query.ilike('address', `%${city}%`);
  }

  query = query.or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%');

  const { data: nearbyProperties, error: nearbyError } = await query;

  if (nearbyError) {
    console.error('Error:', nearbyError);
    return;
  }

  console.log('=== 近隣物件 (' + nearbyProperties.length + '件) ===');
  nearbyProperties.forEach((prop: any, index: number) => {
    console.log(`${index + 1}. ${prop.property_number}`);
    console.log('   住所:', prop.address);
    console.log('   種別:', prop.property_type);
    console.log('   価格:', prop.price?.toLocaleString(), '円');
    console.log('   ステータス:', prop.atbb_status);
    console.log('');
  });

  // 三佐や家島が含まれているか確認
  const misaOrIeshima = nearbyProperties.filter((prop: any) => 
    prop.address?.includes('三佐') || prop.address?.includes('家島')
  );

  if (misaOrIeshima.length > 0) {
    console.log('=== 三佐・家島の物件 (' + misaOrIeshima.length + '件) ===');
    misaOrIeshima.forEach((prop: any) => {
      console.log('物件番号:', prop.property_number);
      console.log('住所:', prop.address);
      console.log('');
    });
  }
}

checkProperty();
