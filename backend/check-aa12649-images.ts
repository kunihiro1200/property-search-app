import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPropertyImages() {
  console.log('🔍 Checking property AA12649 images...\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, image_url, storage_location, images')
    .eq('property_number', 'AA12649')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Property data:');
  console.log('  Property Number:', data.property_number);
  console.log('  Image URL:', data.image_url);
  console.log('  Storage Location:', data.storage_location);
  console.log('  Images:', JSON.stringify(data.images, null, 2));
}

checkPropertyImages();
