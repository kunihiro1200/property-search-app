import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiAA1() {
  console.log('=== Testing API Response for AA1 ===\n');

  // Get seller with property
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('seller_number', 'AA1')
    .single();

  if (sellerError) {
    console.error('Error:', sellerError);
    return;
  }

  console.log('Seller API Response:');
  console.log('- ID:', seller.id);
  console.log('- Seller Number:', seller.seller_number);
  console.log('- Name:', seller.name);
  console.log('- Status:', seller.status);
  console.log('\nValuation Amounts:');
  console.log('- valuation_amount_1:', seller.valuation_amount_1);
  console.log('- valuation_amount_2:', seller.valuation_amount_2);
  console.log('- valuation_amount_3:', seller.valuation_amount_3);
  console.log('\nProperty:');
  if (seller.property && seller.property.length > 0) {
    const prop = seller.property[0];
    console.log('- Address:', prop.address);
    console.log('- Land Area:', prop.land_area);
    console.log('- Building Area:', prop.building_area);
    console.log('- Build Year:', prop.build_year);
    console.log('- Floor Plan:', prop.floor_plan);
  } else {
    console.log('- No property found');
  }
}

testApiAA1()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
