import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13226() {
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('id, property_number, favorite_comment, recommended_comments')
    .eq('property_number', 'AA13226')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('AA13226 current data:');
  console.log('ID:', property.id);
  console.log('Property Number:', property.property_number);
  console.log('Favorite Comment:', property.favorite_comment || '(null)');
  console.log('Recommended Comments:', property.recommended_comments || '(null)');
}

checkAA13226();
