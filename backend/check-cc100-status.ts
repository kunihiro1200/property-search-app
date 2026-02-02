import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCC100Status() {
  console.log('🔍 Checking CC100 status...\n');
  
  // property_detailsを確認
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC100')
    .single();
  
  if (detailsError) {
    console.error('❌ Error fetching property_details:', detailsError.message);
  } else {
    console.log('📊 property_details:');
    console.log(`  property_number: ${details.property_number}`);
    console.log(`  favorite_comment: ${details.favorite_comment ? '✅ あり' : '❌ なし'}`);
    console.log(`  recommended_comments: ${details.recommended_comments && details.recommended_comments.length > 0 ? `✅ あり (${details.recommended_comments.length}件)` : '❌ なし'}`);
    console.log(`  athome_data: ${details.athome_data && details.athome_data.length > 0 ? `✅ あり (${details.athome_data.length}件)` : '❌ なし'}`);
    console.log(`  property_about: ${details.property_about ? '✅ あり' : '❌ なし'}`);
  }
  
  console.log('\n');
  
  // property_listingsを確認
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_number, property_type')
    .eq('property_number', 'CC100')
    .single();
  
  if (listingError) {
    console.error('❌ Error fetching property_listings:', listingError.message);
  } else {
    console.log('📊 property_listings:');
    console.log(`  property_number: ${listing.property_number}`);
    console.log(`  property_type: ${listing.property_type}`);
  }
}

checkCC100Status().catch(console.error);
