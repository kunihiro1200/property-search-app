import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCC105Coordinates() {
  console.log('🔍 Checking CC105 coordinates...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude, google_map_url, address')
    .eq('property_number', 'CC105')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 CC105 data:');
  console.log(JSON.stringify(data, null, 2));
  console.log('');
  
  if (!data.latitude || !data.longitude) {
    console.log('⚠️ CC105 has no coordinates!');
    console.log('');
    console.log('Google Map URL:', data.google_map_url);
    console.log('Address:', data.address);
  } else {
    console.log('✅ CC105 has coordinates:');
    console.log(`  Latitude: ${data.latitude}`);
    console.log(`  Longitude: ${data.longitude}`);
  }
}

checkCC105Coordinates().catch(console.error);
