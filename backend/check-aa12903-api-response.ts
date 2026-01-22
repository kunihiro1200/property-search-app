import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApiResponse() {
  console.log('🔍 Checking what API returns for AA12903...\n');

  // AA12903の売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('seller_number', 'AA12903')
    .single();

  if (sellerError || !seller) {
    console.error('❌ Seller not found:', sellerError);
    return;
  }

  console.log('✅ Seller found:', seller.seller_number);
  console.log('\n📊 Property data in API response:');
  console.log(JSON.stringify(seller.property, null, 2));
  
  console.log('\n🔍 Specific fields:');
  console.log('  address:', seller.property?.address);
  console.log('  land_area:', seller.property?.land_area);
  console.log('  building_area:', seller.property?.building_area);
  console.log('  build_year:', seller.property?.build_year);
  console.log('  floor_plan:', seller.property?.floor_plan);
  console.log('  property_type:', seller.property?.property_type);
}

checkApiResponse().catch(console.error);
