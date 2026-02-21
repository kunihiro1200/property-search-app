import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperties() {
  const propertyNumbers = ['AA13407'];
  
  console.log('Checking AA13407 property data...\n');
  
  for (const propertyNumber of propertyNumbers) {
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, broker_response, property_tax')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      console.log(`❌ ${propertyNumber}: NOT FOUND`);
      console.log(`   Error: ${error.message}\n`);
    } else {
      console.log(`✓ ${propertyNumber}: FOUND`);
      console.log(`   broker_response: ${data.broker_response || 'NULL'}`);
      console.log(`   property_tax: ${data.property_tax || 'NULL'}`);
      console.log(`   Full data:`, JSON.stringify(data, null, 2));
    }
  }
}

checkProperties().catch(console.error);
