import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC5CompleteData() {
  console.log('=== CC5 Complete Data Check ===\n');
  
  // 1. property_listingsからCC5を取得
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC5')
    .single();
  
  if (propError) {
    console.error('Property error:', propError);
    return;
  }
  
  console.log('Property data:', {
    property_number: property.property_number,
    address: property.address,
    price: property.price,
  });
  
  // 2. property_detailsからCC5を取得
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC5')
    .single();
  
  if (detailsError) {
    console.error('Details error:', detailsError);
  } else {
    console.log('\nProperty details:', {
      property_number: details.property_number,
      favorite_comment: details.favorite_comment,
      recommended_comments: details.recommended_comments,
      property_about: details.property_about,
      panorama_url: details.panorama_url,
    });
  }
  
  // 3. athome_dataからCC5を取得
  const { data: athome, error: athomeError } = await supabase
    .from('athome_data')
    .select('*')
    .eq('property_number', 'CC5')
    .single();
  
  if (athomeError) {
    console.error('Athome error:', athomeError);
  } else {
    console.log('\nAthome data:', {
      property_number: athome.property_number,
      panorama_url: athome.panorama_url,
    });
  }
  
  // 4. sellersからCC5の決済日を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('settlement_date')
    .eq('property_number', 'CC5')
    .single();
  
  if (sellerError) {
    console.error('Seller error:', sellerError);
  } else {
    console.log('\nSeller data:', {
      settlement_date: seller.settlement_date,
    });
  }
  
  console.log('\n=== Summary ===');
  console.log('favoriteComment:', details?.favorite_comment || 'なし');
  console.log('recommendedComments:', details?.recommended_comments || 'なし');
  console.log('propertyAbout:', details?.property_about || 'なし');
  console.log('panoramaUrl (details):', details?.panorama_url || 'なし');
  console.log('panoramaUrl (athome):', athome?.panorama_url || 'なし');
}

checkCC5CompleteData().catch(console.error);
