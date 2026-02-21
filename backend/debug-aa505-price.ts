import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAA505Price() {
  console.log('🔍 Debugging AA505 price...\n');

  try {
    // 1. property_listingsテーブルからAA505を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_number, price, sales_price, listing_price')
      .eq('property_number', 'AA505')
      .single();

    if (propertyError || !property) {
      console.error('❌ Property not found:', propertyError);
      return;
    }

    console.log('✅ Property AA505:');
    console.log(`  - property_number: ${property.property_number}`);
    console.log(`  - price: ${property.price}`);
    console.log(`  - sales_price: ${property.sales_price}`);
    console.log(`  - listing_price: ${property.listing_price}`);

    // 2. 全てのカラムを取得して確認
    const { data: fullProperty, error: fullError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA505')
      .single();

    if (fullError) {
      console.error('\n❌ Error fetching full property:', fullError);
      return;
    }

    console.log('\n✅ Full property data retrieved');
    console.log(`  - Has price: ${!!fullProperty.price}`);
    console.log(`  - Has sales_price: ${!!fullProperty.sales_price}`);
    console.log(`  - Has listing_price: ${!!fullProperty.listing_price}`);

    // 3. 近隣物件検索で使用される価格を確認
    console.log('\n📊 Price used for nearby search:');
    const searchPrice = fullProperty.price || fullProperty.sales_price || 0;
    console.log(`  - Search price: ${searchPrice}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugAA505Price();
