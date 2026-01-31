import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // 売主テーブルを確認
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('seller_number, name, property_address, property_type, status')
    .eq('seller_number', 'AA9112')
    .single();
  
  console.log('=== 売主テーブル ===');
  if (sellerError) {
    console.log('エラー:', sellerError.message);
  } else {
    console.log(seller);
  }
  
  // property_listingsテーブルを確認
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_number, property_address, property_type, status')
    .eq('property_number', 'AA9112')
    .single();
  
  console.log('\n=== property_listings ===');
  if (listingError) {
    console.log('エラー:', listingError.message);
  } else {
    console.log(listing);
  }
}

check();
