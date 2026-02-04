import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

(async () => {
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, property_address, latitude, longitude')
    .eq('seller_number', 'AA13500')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ AA13500の情報:');
    console.log('物件住所:', data.property_address);
    console.log('現在の座標:', { lat: data.latitude, lng: data.longitude });
  }
})();
