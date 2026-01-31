import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13459PropertyType() {
  const propertyNumber = 'AA13459';
  
  console.log(`\n=== ${propertyNumber} の物件種別を確認 ===\n`);
  
  // property_listingsテーブルを確認
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('id, property_number, property_type, atbb_status')
    .eq('property_number', propertyNumber)
    .single();
  
  if (listingError) {
    console.log(`❌ エラー: ${listingError.message}`);
    return;
  }
  
  console.log(`物件情報:`);
  console.log(`  - property_number: ${listing.property_number}`);
  console.log(`  - property_type: "${listing.property_type}"`);
  console.log(`  - atbb_status: ${listing.atbb_status}`);
  
  // property_typeの値を確認
  const validTypes = ['land', 'detached_house', 'apartment'];
  if (validTypes.includes(listing.property_type)) {
    console.log(`\n✅ property_type "${listing.property_type}" は有効な値です`);
  } else {
    console.log(`\n❌ property_type "${listing.property_type}" は無効な値です`);
    console.log(`   有効な値: ${validTypes.join(', ')}`);
    console.log(`\n   これが原因でおすすめコメントの同期が失敗している可能性があります`);
  }
}

checkAA13459PropertyType().catch(console.error);
