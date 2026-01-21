// CC5とCC21のデータを比較
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function compareProperties() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('=== CC5とCC21のデータ比較 ===\n');
  
  for (const propNumber of ['CC5', 'CC21']) {
    console.log(`\n--- ${propNumber} ---`);
    
    // property_listingsテーブル
    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propNumber)
      .single();
    
    if (listingError) {
      console.error(`  property_listings エラー:`, listingError.message);
    } else {
      console.log(`  property_listings: ✓`);
      console.log(`    - id: ${listing.id}`);
      console.log(`    - atbb_status: ${listing.atbb_status}`);
      console.log(`    - storage_location: ${listing.storage_location ? '✓' : '✗'}`);
    }
    
    // property_detailsテーブル
    const { data: details, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propNumber)
      .single();
    
    if (detailsError) {
      console.error(`  property_details エラー:`, detailsError.message);
    } else {
      console.log(`  property_details: ✓`);
      console.log(`    - favorite_comment: ${details.favorite_comment ? '✓' : '✗'}`);
      console.log(`    - recommended_comments: ${details.recommended_comments ? `✓ (${details.recommended_comments.length} rows)` : '✗'}`);
      console.log(`    - athome_data: ${details.athome_data ? `✓ (${details.athome_data.length} items)` : '✗'}`);
      console.log(`    - property_about: ${details.property_about ? '✓' : '✗'}`);
    }
  }
}

compareProperties().catch(console.error);
