import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkFirst6PropertiesStorage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('Checking first 6 properties (sorted by distribution_date desc)...\n');
    
    // 公開物件APIと同じクエリを実行
    const { data, error } = await supabase
      .from('property_listings')
      .select('id, property_number, address, storage_location, image_url, atbb_status')
      .order('distribution_date', { ascending: false, nullsFirst: false })
      .range(0, 5); // 最初の6件
    
    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    console.log(`Found ${data?.length || 0} properties:\n`);
    
    data?.forEach((property, index) => {
      console.log(`${index + 1}. ${property.property_number}`);
      console.log(`   Address: ${property.address}`);
      console.log(`   ATBB Status: ${property.atbb_status}`);
      console.log(`   Has image_url: ${!!property.image_url}`);
      console.log(`   Has storage_location: ${!!property.storage_location}`);
      if (property.storage_location) {
        console.log(`   Storage Location: ${property.storage_location}`);
      }
      console.log('');
    });
    
    // storage_locationがnullの物件をカウント
    const nullStorageCount = data?.filter(p => !p.storage_location).length || 0;
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${data?.length || 0} properties`);
    console.log(`   With storage_location: ${(data?.length || 0) - nullStorageCount}`);
    console.log(`   Without storage_location: ${nullStorageCount}`);
    
    if (nullStorageCount > 0) {
      console.log(`\n⚠️  ${nullStorageCount} properties are missing storage_location!`);
      console.log(`   These properties will not display images.`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkFirst6PropertiesStorage();
