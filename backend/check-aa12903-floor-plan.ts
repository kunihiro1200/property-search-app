import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFloorPlan() {
  console.log('🔍 Checking AA12903 floor_plan data...\n');

  // AA12903の物件情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA12903')
    .single();

  if (sellerError || !seller) {
    console.error('❌ Seller not found:', sellerError);
    return;
  }

  console.log('✅ Found seller:', seller.seller_number);

  // 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (propertyError || !property) {
    console.error('❌ Property not found:', propertyError);
    return;
  }

  console.log('\n📊 Property data:');
  console.log('  ID:', property.id);
  console.log('  Address:', property.address);
  console.log('  Land Area:', property.land_area);
  console.log('  Building Area:', property.building_area);
  console.log('  Build Year:', property.build_year);
  console.log('  Floor Plan:', property.floor_plan || '(empty)');
  console.log('  Seller Situation:', property.seller_situation);
}

checkFloorPlan().catch(console.error);
