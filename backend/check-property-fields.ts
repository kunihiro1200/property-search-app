import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropertyFields() {
  console.log('=== Checking Property Fields ===\n');

  // Get 10 sellers with properties
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      name,
      properties (
        id,
        address,
        property_type,
        land_area,
        building_area,
        build_year,
        floor_plan,
        structure,
        seller_situation
      )
    `)
    .not('properties', 'is', null)
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${sellers?.length} sellers with properties:\n`);
  
  sellers?.forEach((seller, index) => {
    const property = Array.isArray(seller.properties) ? seller.properties[0] : seller.properties;
    
    console.log(`${index + 1}. ${seller.seller_number} - ${seller.name}`);
    if (property) {
      console.log(`   Address: ${property.address || 'NULL'}`);
      console.log(`   Property Type: ${property.property_type || 'NULL'}`);
      console.log(`   Land Area: ${property.land_area || 'NULL'}`);
      console.log(`   Building Area: ${property.building_area || 'NULL'}`);
      console.log(`   Build Year: ${property.build_year || 'NULL'}`);
      console.log(`   Floor Plan: ${property.floor_plan || 'NULL'}`);
      console.log(`   Structure: ${property.structure || 'NULL'}`);
      console.log(`   Seller Situation: ${property.seller_situation || 'NULL'}`);
    } else {
      console.log('   No property data');
    }
    console.log('');
  });
}

checkPropertyFields()
  .then(() => {
    console.log('✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
