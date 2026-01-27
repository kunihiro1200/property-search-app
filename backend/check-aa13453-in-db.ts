import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAA13453() {
  console.log('🔍 Checking AA13453 in database...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // property_listingsテーブルを確認
  const { data: propertyListing, error: plError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13453')
    .maybeSingle();

  if (plError) {
    console.error('❌ Error querying property_listings:', plError.message);
  } else if (propertyListing) {
    console.log('✅ AA13453 found in property_listings table:');
    console.log('   Property Number:', propertyListing.property_number);
    console.log('   Address:', propertyListing.address);
    console.log('   Price:', propertyListing.price);
    console.log('   ATBB Status:', propertyListing.atbb_status);
    console.log('   Created At:', propertyListing.created_at);
    console.log('   Updated At:', propertyListing.updated_at);
    console.log('   Last Synced At:', propertyListing.last_synced_at);
  } else {
    console.log('❌ AA13453 NOT found in property_listings table');
  }

  console.log('\n');

  // sellersテーブルも確認（AA13453が売主番号として存在するか）
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13453')
    .maybeSingle();

  if (sellerError) {
    console.error('❌ Error querying sellers:', sellerError.message);
  } else if (seller) {
    console.log('✅ AA13453 found in sellers table:');
    console.log('   Seller Number:', seller.seller_number);
    console.log('   Status:', seller.status);
    console.log('   Created At:', seller.created_at);
    console.log('   Updated At:', seller.updated_at);
  } else {
    console.log('ℹ️  AA13453 NOT found in sellers table (this is OK if it\'s only a property)');
  }

  console.log('\n');

  // 最新の物件番号を確認
  const { data: latestProperties, error: latestError } = await supabase
    .from('property_listings')
    .select('property_number, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (latestError) {
    console.error('❌ Error querying latest properties:', latestError.message);
  } else if (latestProperties && latestProperties.length > 0) {
    console.log('📊 Latest 10 properties in database:');
    latestProperties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.property_number} (created: ${prop.created_at})`);
    });
  }
}

checkAA13453().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
