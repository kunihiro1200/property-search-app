import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5174PropertyDetails() {
  console.log('=== Checking AA5174 Property Details ===\n');

  // Get seller
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5174')
    .single();

  if (sellerError) {
    console.error('❌ Seller Error:', sellerError);
    return;
  }

  console.log('Seller ID:', seller.id);
  console.log('Seller Number:', seller.seller_number);
  console.log('Seller Name:', seller.name);
  console.log('');

  // Get property
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propError) {
    console.error('❌ Property Error:', propError);
    return;
  }

  console.log(`Found ${properties?.length || 0} properties:\n`);
  
  properties?.forEach((property, index) => {
    console.log(`Property ${index + 1}:`);
    console.log('  ID:', property.id);
    console.log('  Seller ID:', property.seller_id);
    console.log('  Address:', property.address);
    console.log('  Property Type:', property.property_type);
    console.log('  Land Area:', property.land_area);
    console.log('  Building Area:', property.building_area);
    console.log('  Build Year:', property.build_year);
    console.log('  Floor Plan:', property.floor_plan);
    console.log('  Structure:', property.structure);
    console.log('  Seller Situation:', property.seller_situation);
    console.log('  Created At:', property.created_at);
    console.log('  Updated At:', property.updated_at);
    console.log('');
  });

  // Check if there are any NULL values
  if (properties && properties.length > 0) {
    const prop = properties[0];
    const nullFields = [];
    
    if (!prop.land_area) nullFields.push('land_area');
    if (!prop.building_area) nullFields.push('building_area');
    if (!prop.build_year) nullFields.push('build_year');
    if (!prop.floor_plan) nullFields.push('floor_plan');
    if (!prop.structure) nullFields.push('structure');
    
    if (nullFields.length > 0) {
      console.log('⚠️ NULL Fields:', nullFields.join(', '));
    } else {
      console.log('✅ All fields have values');
    }
  }
}

checkAA5174PropertyDetails()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
