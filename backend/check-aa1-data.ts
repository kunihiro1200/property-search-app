import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA1() {
  console.log('=== Checking AA1 Data ===\n');

  // Get seller data
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA1')
    .single();

  if (sellerError) {
    console.error('Error fetching seller:', sellerError);
    return;
  }

  console.log('Seller Data:');
  console.log('- Seller Number:', seller.seller_number);
  console.log('- Name:', seller.name);
  console.log('- Valuation Amount 1:', seller.valuation_amount_1, '円');
  console.log('- Valuation Amount 2:', seller.valuation_amount_2, '円');
  console.log('- Valuation Amount 3:', seller.valuation_amount_3, '円');
  console.log('\nExpected (from manual input):');
  console.log('- Should be: 15,000,000円, 16,000,000円, 18,000,000円');
  console.log('- NOT: 400,000円, 2,400,000円, 5,400,000円 (auto-calculated)');

  // Get property data
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (propertyError) {
    console.log('\nNo property found for this seller');
  } else {
    console.log('\nProperty Data:');
    console.log('- Address:', property.address);
    console.log('- Land Area:', property.land_area, '㎡');
    console.log('- Building Area:', property.building_area, '㎡');
    console.log('- Build Year:', property.build_year);
    console.log('- Floor Plan:', property.floor_plan);
    console.log('- Structure:', property.structure);
  }
}

checkAA1()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
