import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5174() {
  console.log('=== Checking AA5174 Data ===\n');

  // Get seller data
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5174')
    .single();

  if (sellerError) {
    console.error('Error fetching seller:', sellerError);
    return;
  }

  console.log('Seller Data:');
  console.log('- Name:', seller.name);
  console.log('- Status:', seller.status);
  console.log('- Valuation Amount 1:', seller.valuation_amount_1);
  console.log('- Valuation Amount 2:', seller.valuation_amount_2);
  console.log('- Valuation Amount 3:', seller.valuation_amount_3);

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
    console.log('- Land Area:', property.land_area);
    console.log('- Building Area:', property.building_area);
    console.log('- Build Year:', property.build_year);
    console.log('- Floor Plan:', property.floor_plan);
    console.log('- Structure:', property.structure);
  }
}

checkAA5174()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
