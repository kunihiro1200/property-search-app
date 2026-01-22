import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== AA13129 データ確認 ===\n');

  // Check sellers table
  console.log('1. sellersテーブルを確認中...');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13129')
    .maybeSingle();

  if (sellerError) {
    console.error('エラー:', sellerError);
  } else if (seller) {
    console.log('✅ 売主データ:');
    console.log('  - seller_number:', seller.seller_number);
    console.log('  - address:', seller.address);
    console.log('  - city:', seller.city);
    console.log('  - google_map_url:', seller.google_map_url);
  } else {
    console.log('❌ 売主が見つかりません');
  }

  console.log();

  // Check property_listings table
  console.log('2. property_listingsテーブルを確認中...');
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .maybeSingle();

  if (listingError) {
    console.error('エラー:', listingError);
  } else if (listing) {
    console.log('✅ 物件リスティングデータ:');
    console.log('  - property_number:', listing.property_number);
    console.log('  - address:', listing.address);
    console.log('  - city:', listing.city);
    console.log('  - google_map_url:', listing.google_map_url);
    console.log('  - distribution_areas:', listing.distribution_areas);
  } else {
    console.log('❌ 物件リスティングが見つかりません');
  }
}

main();
