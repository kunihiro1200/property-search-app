import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  // 1. sellersテーブルでAA376を確認
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, property_address, property_type')
    .eq('seller_number', 'AA376')
    .single();
  
  console.log('=== sellers テーブル ===');
  if (sellerError) {
    console.log('Error:', sellerError.message);
  } else {
    console.log('seller_number:', seller.seller_number);
    console.log('name:', seller.name);
    console.log('property_address:', seller.property_address);
    console.log('property_type:', seller.property_type);
    console.log('id:', seller.id);
  }
  
  // 2. propertiesテーブルでAA376を確認
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, property_number, address, property_type, seller_id')
    .eq('property_number', 'AA376')
    .single();
  
  console.log('\n=== properties テーブル ===');
  if (propError) {
    console.log('Error:', propError.message);
    console.log('→ AA376の物件レコードが存在しません');
  } else {
    console.log('property_number:', property.property_number);
    console.log('address:', property.address);
    console.log('property_type:', property.property_type);
    console.log('seller_id:', property.seller_id);
  }
}

check().catch(console.error);
