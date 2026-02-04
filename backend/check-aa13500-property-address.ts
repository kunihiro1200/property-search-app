import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13500PropertyAddress() {
  console.log('🔍 AA13500の物件住所を確認...\n');

  // AA13500の売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number, property_address, latitude, longitude')
    .eq('seller_number', 'AA13500')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError?.message);
    return;
  }

  console.log('✅ 売主情報:');
  console.log('  売主番号:', seller.seller_number);
  console.log('  売主ID:', seller.id);
  console.log('  物件住所:', seller.property_address);
  console.log('  緯度:', seller.latitude);
  console.log('  経度:', seller.longitude);
  console.log('');

  // 物件情報も確認
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, property_address, address')
    .eq('seller_id', seller.id)
    .single();

  if (!propertyError && property) {
    console.log('✅ 物件情報:');
    console.log('  物件ID:', property.id);
    console.log('  property_address:', property.property_address);
    console.log('  address:', property.address);
  }
}

checkAA13500PropertyAddress();
