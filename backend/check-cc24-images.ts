import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCC24Images() {
  console.log('=== CC24画像データ確認 ===\n');

  // 1. property_listingsテーブルのデータを確認
  const { data: propertyData, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .eq('property_number', 'CC24')
    .single();

  if (propertyError) {
    console.error('Property data error:', propertyError);
    return;
  }

  console.log('Property Listings Data:');
  console.log('- property_number:', propertyData.property_number);
  console.log('- storage_location:', propertyData.storage_location);
  console.log('- image_url:', propertyData.image_url);
  console.log('\n');

  // 2. property_detailsテーブルのデータを確認
  const { data: detailsData, error: detailsError } = await supabase
    .from('property_details')
    .select('property_number, image_urls, hidden_images')
    .eq('property_number', 'CC24')
    .single();

  if (detailsError) {
    console.error('Property details error:', detailsError);
  } else {
    console.log('Property Details Data:');
    console.log('- property_number:', detailsData.property_number);
    console.log('- image_urls:', detailsData.image_urls);
    console.log('- image_urls length:', detailsData.image_urls?.length || 0);
    console.log('- hidden_images:', detailsData.hidden_images);
    console.log('\n');
  }

  // 3. 画像URLの詳細を表示
  if (detailsData?.image_urls && detailsData.image_urls.length > 0) {
    console.log('=== 画像URL詳細 ===');
    detailsData.image_urls.forEach((url: string, index: number) => {
      console.log(`${index + 1}. ${url}`);
    });
  } else {
    console.log('⚠️ 画像URLが存在しません');
  }
}

checkCC24Images().catch(console.error);
