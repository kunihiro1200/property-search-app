// CC21のUUIDを取得
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function getCC21Uuid() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number')
    .eq('property_number', 'CC21')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('CC21 UUID:', data.id);
  console.log('Property Number:', data.property_number);
}

getCC21Uuid().catch(console.error);
