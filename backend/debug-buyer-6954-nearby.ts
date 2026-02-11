import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBuyer6954Nearby() {
  console.log('🔍 Debugging buyer 6954 nearby properties...\n');

  try {
    // 1. 買主6954の情報を取得
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('buyer_number, property_number')
      .eq('buyer_number', '6954')
      .single();

    if (buyerError || !buyer) {
      console.error('❌ Buyer not found:', buyerError);
      return;
    }

    console.log('✅ Buyer 6954:');
    console.log(`  - buyer_number: ${buyer.buyer_number}`);
    console.log(`  - property_number: ${buyer.property_number}`);

    if (!buyer.property_number) {
      console.log('\n⚠️ No property_number found for buyer 6954');
      return;
    }

    // 2. 基準物件を取得（修正後のselect）
    const { data: baseProperty, error: baseError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', buyer.property_number)
      .single();

    if (baseError || !baseProperty) {
      console.error('\n❌ Base property not found:', baseError);
      return;
    }

    console.log('\n✅ Base property:');
    console.log(`  - property_number: ${baseProperty.property_number}`);
    console.log(`  - address: ${baseProperty.address}`);
    console.log(`  - property_type: ${baseProperty.property_type}`);
    console.log(`  - price: ${baseProperty.price}`);
    console.log(`  - sales_price: ${baseProperty.sales_price}`);
    console.log(`  - latitude: ${baseProperty.latitude}`);
    console.log(`  - longitude: ${baseProperty.longitude}`);
    console.log(`  - distribution_areas: ${baseProperty.distribution_areas || 'N/A'}`);

    // 3. 価格帯を計算
    const price = baseProperty.price || baseProperty.sales_price || 0;
    let minPrice, maxPrice;
    
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

    console.log(`\n📊 Price range: ${minPrice} - ${maxPrice}`);

    // 4. 近隣物件を検索（修正後のselect）
    const { data: nearbyProperties, error: nearbyError } = await supabase
      .from('property_listings')
      .select('*')
      .neq('property_number', baseProperty.property_number)
      .gte('price', minPrice)
      .lte('price', maxPrice)
      .eq('property_type', baseProperty.property_type)
      .or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');

    if (nearbyError) {
      console.error('\n❌ Error fetching nearby properties:', nearbyError);
      return;
    }

    console.log(`\n✅ Found ${nearbyProperties?.length || 0} nearby properties`);

    if (nearbyProperties && nearbyProperties.length > 0) {
      console.log('\n📋 Nearby properties:');
      nearbyProperties.slice(0, 5).forEach(p => {
        console.log(`  - ${p.property_number}: ${p.address} (${p.property_type}, ${p.price}円)`);
      });
    }

    // 5. 修正前のselect('*')で検索
    console.log('\n🔄 Testing with select("*")...');
    const { data: nearbyPropertiesAll, error: nearbyErrorAll } = await supabase
      .from('property_listings')
      .select('*')
      .neq('property_number', baseProperty.property_number)
      .gte('price', minPrice)
      .lte('price', maxPrice)
      .eq('property_type', baseProperty.property_type)
      .or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');

    if (nearbyErrorAll) {
      console.error('❌ Error with select("*"):', nearbyErrorAll);
    } else {
      console.log(`✅ Found ${nearbyPropertiesAll?.length || 0} properties with select("*")`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugBuyer6954Nearby();
