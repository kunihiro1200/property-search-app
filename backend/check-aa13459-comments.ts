import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13459Comments() {
  const propertyNumber = 'AA13459';
  
  console.log(`\n=== ${propertyNumber} のコメントデータを確認 ===\n`);
  
  // 1. property_listingsテーブルを確認
  console.log('1. property_listings テーブル:');
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location')
    .eq('property_number', propertyNumber)
    .single();
  
  if (listingError) {
    console.log(`   ❌ エラー: ${listingError.message}`);
  } else if (listing) {
    console.log(`   ✅ 存在`);
    console.log(`   - ID: ${listing.id}`);
    console.log(`   - storage_location: ${listing.storage_location || '(なし)'}`);
  } else {
    console.log(`   ❌ 見つかりません`);
  }
  
  // 2. property_detailsテーブルを確認
  console.log('\n2. property_details テーブル:');
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (detailsError) {
    console.log(`   ❌ エラー: ${detailsError.message}`);
  } else if (details) {
    console.log(`   ✅ 存在`);
    console.log(`   - favorite_comment: ${details.favorite_comment || '(なし)'}`);
    console.log(`   - recommended_comments: ${JSON.stringify(details.recommended_comments)}`);
    console.log(`   - panorama_url: ${details.panorama_url || '(なし)'}`);
    console.log(`   - property_about: ${details.property_about ? details.property_about.substring(0, 50) + '...' : '(なし)'}`);
    console.log(`   - athome_data: ${details.athome_data ? JSON.stringify(details.athome_data).substring(0, 100) + '...' : '(なし)'}`);
  } else {
    console.log(`   ❌ 見つかりません`);
  }
  
  // 3. 本番APIのレスポンスを確認
  console.log('\n3. 本番API レスポンス確認:');
  try {
    const response = await fetch(`https://property-site-backend.vercel.app/api/public/properties/${listing?.id}/complete`);
    const data = await response.json();
    
    console.log(`   - favoriteComment: ${data.favoriteComment || '(なし)'}`);
    console.log(`   - recommendedComments: ${JSON.stringify(data.recommendedComments)}`);
    console.log(`   - panoramaUrl: ${data.panoramaUrl || '(なし)'}`);
    console.log(`   - propertyAbout: ${data.propertyAbout ? data.propertyAbout.substring(0, 50) + '...' : '(なし)'}`);
  } catch (error: any) {
    console.log(`   ❌ APIエラー: ${error.message}`);
  }
}

checkAA13459Comments().catch(console.error);
