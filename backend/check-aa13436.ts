import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA13436() {
  console.log('🔍 Checking AA13436 property data...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, latitude, longitude, address, display_address')
    .eq('property_number', 'AA13436')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Property data:');
  console.log(JSON.stringify(data, null, 2));
  
  // 座標の有無を確認
  console.log('\n📍 Coordinate status:');
  console.log('- latitude:', data.latitude ? `${data.latitude} ✅` : 'null ❌');
  console.log('- longitude:', data.longitude ? `${data.longitude} ✅` : 'null ❌');
  console.log('- google_map_url:', data.google_map_url ? `${data.google_map_url} ✅` : 'null ❌');
}

checkAA13436();
