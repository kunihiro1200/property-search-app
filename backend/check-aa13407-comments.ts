import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13407Comments() {
  console.log('=== AA13407 コメントデータ調査 ===\n');
  
  // property_detailsテーブルを確認
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, athome_data')
    .eq('property_number', 'AA13407');
  
  console.log('📋 property_details テーブル:');
  if (detailsError) {
    console.log('  Error:', detailsError);
  } else if (details && details.length > 0) {
    console.log('  favorite_comment:', details[0].favorite_comment || '(空)');
    console.log('  recommended_comments:', JSON.stringify(details[0].recommended_comments, null, 2) || '(空)');
    console.log('  athome_data (パノラマURL):', JSON.stringify(details[0].athome_data, null, 2) || '(空)');
  } else {
    console.log('  ❌ AA13407 not found in property_details');
  }
  
  // property_listingsテーブルも確認
  const { data: listings, error: listingsError } = await supabase
    .from('property_listings')
    .select('property_number, property_type, atbb_status')
    .eq('property_number', 'AA13407');
  
  console.log('\n📋 property_listings テーブル:');
  if (listingsError) {
    console.log('  Error:', listingsError);
  } else if (listings && listings.length > 0) {
    console.log('  property_type:', listings[0].property_type || '(空)');
    console.log('  atbb_status:', listings[0].atbb_status || '(空)');
  } else {
    console.log('  ❌ AA13407 not found in property_listings');
  }
}

checkAA13407Comments().catch(console.error);
