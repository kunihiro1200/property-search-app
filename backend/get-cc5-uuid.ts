import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCC5UUID() {
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number')
    .eq('property_number', 'CC5')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('CC5 UUID:', data.id);
  console.log('\nAPI URLs:');
  console.log('By UUID:', `https://property-site-frontend-kappa.vercel.app/api/public/properties/${data.id}/complete`);
  console.log('By Number:', `https://property-site-frontend-kappa.vercel.app/api/public/properties/CC5/complete`);
}

getCC5UUID().catch(console.error);
