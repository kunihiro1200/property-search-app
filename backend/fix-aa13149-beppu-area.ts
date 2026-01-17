import { createClient } from '@supabase/supabase-js';
import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA13149() {
  console.log('=== Fixing AA13149 Distribution Area ===\n');
  
  // Get current property data
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13149')
    .single();
  
  if (propError || !property) {
    console.error('Property not found:', propError);
    return;
  }
  
  console.log('Current property data:');
  console.log(`  Address: ${property.address}`);
  console.log(`  Current distribution_areas: ${property.distribution_areas}`);
  console.log('');
  
  // Use BeppuAreaMappingService to get the correct areas
  const beppuService = new BeppuAreaMappingService();
  const fullAddress = `大分県${property.address}`;
  
  console.log(`Looking up areas for: ${fullAddress}\n`);
  
  const areas = await beppuService.getDistributionAreasForAddress(fullAddress);
  
  if (!areas) {
    console.log('No mapping found, would fallback to ㊶');
    return;
  }
  
  console.log(`Found distribution areas: ${areas}`);
  console.log('');
  
  // Update property
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ distribution_areas: areas })
    .eq('property_number', 'AA13149');
  
  if (updateError) {
    console.error('Update failed:', updateError);
    return;
  }
  
  console.log('✅ Successfully updated AA13149');
  
  // Verify
  const { data: updated } = await supabase
    .from('property_listings')
    .select('distribution_areas')
    .eq('property_number', 'AA13149')
    .single();
  
  console.log(`\nVerified distribution_areas: ${updated?.distribution_areas}`);
}

fixAA13149().catch(console.error);
