import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkImageUrls() {
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, image_url, storage_location')
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== 最初の20件の物件 ===');
  let hasImageUrl = 0;
  let hasStorageLocation = 0;
  let hasNeither = 0;
  
  data.forEach(prop => {
    const hasImg = !!prop.image_url;
    const hasStorage = !!prop.storage_location;
    
    if (hasImg) hasImageUrl++;
    if (hasStorage) hasStorageLocation++;
    if (!hasImg && !hasStorage) hasNeither++;
    
    console.log(`${prop.property_number}: image_url=${hasImg ? 'あり' : 'なし'}, storage_location=${hasStorage ? 'あり' : 'なし'}`);
  });
  
  console.log(`\n=== 統計 ===`);
  console.log(`image_urlあり: ${hasImageUrl}件`);
  console.log(`storage_locationあり: ${hasStorageLocation}件`);
  console.log(`両方なし: ${hasNeither}件`);
}

checkImageUrls();
