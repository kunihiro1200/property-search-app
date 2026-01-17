import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA5222Properties() {
  console.log('=== Checking AA5222 Properties ===\n');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA5222')
    .single();

  if (!seller) {
    console.log('Seller not found');
    return;
  }

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  console.log(`Found ${properties?.length} properties for AA5222:\n`);
  
  properties?.forEach((prop, index) => {
    console.log(`Property ${index + 1}:`);
    console.log('  ID:', prop.id);
    console.log('  Address:', prop.address);
    console.log('  Type:', prop.property_type);
    console.log('  Land Area:', prop.land_area);
    console.log('  Building Area:', prop.building_area);
    console.log('  Build Year:', prop.build_year);
    console.log('  Floor Plan:', prop.floor_plan);
    console.log('  Created:', prop.created_at);
    console.log('');
  });
}

checkAA5222Properties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
