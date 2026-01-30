import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function compareProperties() {
  console.log('🔍 Comparing CC105 with other properties...\n');
  
  // CC105を取得
  const { data: cc105, error: cc105Error } = await supabase
    .from('property_listings')
    .select('id, property_number, price, sales_price, listing_price, atbb_status')
    .eq('property_number', 'CC105')
    .single();
  
  if (cc105Error) {
    console.error('❌ Error fetching CC105:', cc105Error);
    return;
  }
  
  console.log('📊 CC105 data:');
  console.log(JSON.stringify(cc105, null, 2));
  console.log('');
  
  // 他の公開中の物件を5件取得
  const { data: otherProperties, error: otherError } = await supabase
    .from('property_listings')
    .select('id, property_number, price, sales_price, listing_price, atbb_status')
    .or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%')
    .neq('property_number', 'CC105')
    .limit(5);
  
  if (otherError) {
    console.error('❌ Error fetching other properties:', otherError);
    return;
  }
  
  console.log('📊 Other properties (5 samples):');
  otherProperties?.forEach(prop => {
    console.log(JSON.stringify(prop, null, 2));
    console.log('');
  });
  
  // 比較
  console.log('🔍 Comparison:');
  console.log('');
  console.log('CC105:');
  console.log(`  price: ${cc105.price} (type: ${typeof cc105.price})`);
  console.log(`  sales_price: ${cc105.sales_price} (type: ${typeof cc105.sales_price})`);
  console.log(`  listing_price: ${cc105.listing_price} (type: ${typeof cc105.listing_price})`);
  console.log(`  atbb_status: ${cc105.atbb_status}`);
  console.log('');
  
  console.log('Other properties:');
  otherProperties?.forEach(prop => {
    console.log(`${prop.property_number}:`);
    console.log(`  price: ${prop.price} (type: ${typeof prop.price})`);
    console.log(`  sales_price: ${prop.sales_price} (type: ${typeof prop.sales_price})`);
    console.log(`  listing_price: ${prop.listing_price} (type: ${typeof prop.listing_price})`);
    console.log(`  atbb_status: ${prop.atbb_status}`);
    console.log('');
  });
}

compareProperties().catch(console.error);
