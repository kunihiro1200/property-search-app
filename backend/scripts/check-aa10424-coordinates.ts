import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAA10424Coordinates() {
  console.log('🔍 Checking AA10424 coordinates...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, address, latitude, longitude, google_map_url')
    .eq('property_number', 'AA10424')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 AA10424 Data:');
  console.log(`  Property Number: ${data.property_number}`);
  console.log(`  Address: ${data.address}`);
  console.log(`  Latitude: ${data.latitude || 'NULL'}`);
  console.log(`  Longitude: ${data.longitude || 'NULL'}`);
  console.log(`  Google Map URL: ${data.google_map_url || 'NULL'}`);
  
  if (!data.latitude || !data.longitude) {
    console.log('\n⚠️ Coordinates are NULL - need to geocode!');
  } else {
    console.log('\n✅ Coordinates are set!');
  }
}

checkAA10424Coordinates().catch(console.error);
