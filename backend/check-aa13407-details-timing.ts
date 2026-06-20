/**
 * AA13407のproperty_listingsとproperty_detailsの作成タイミングを確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('=== AA13407 作成タイミング調査 ===\n');

  // property_listingsを確認
  const { data: listing } = await supabase
    .from('property_listings')
    .select('property_number, property_type, created_at, updated_at')
    .eq('property_number', 'AA13407')
    .single();
  
  console.log('📋 property_listings:');
  console.log('  存在:', listing ? '✅ はい' : '❌ いいえ');
  if (listing) {
    console.log('  property_type:', listing.property_type);
    console.log('  created_at:', listing.created_at);
    console.log('  updated_at:', listing.updated_at);
  }
  
  // property_detailsを確認
  const { data: details } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, athome_data, created_at, updated_at')
    .eq('property_number', 'AA13407')
    .single();
  
  console.log('\n📋 property_details:');
  console.log('  存在:', details ? '✅ はい' : '❌ いいえ');
  if (details) {
    console.log('  created_at:', details.created_at);
    console.log('  updated_at:', details.updated_at);
    console.log('  favorite_comment:', details.favorite_comment ? '✅ 入っている' : '❌ 空');
    console.log('  recommended_comments:', details.recommended_comments?.length || 0, '件');
    console.log('  athome_data:', details.athome_data?.length || 0, '件');
  }

  // 結論
  console.log('\n📊 分析:');
  if (listing && details) {
    const listingCreated = new Date(listing.created_at);
    const detailsCreated = new Date(details.created_at);
    
    if (detailsCreated < listingCreated) {
      console.log('  property_detailsがproperty_listingsより先に作成されている');
      console.log('  → Phase 4.7の同期対象外（既にproperty_detailsが存在するため）');
    } else {
      console.log('  property_listingsがproperty_detailsより先に作成されている');
    }
    
    console.log('\n  タイムライン:');
    console.log(`    property_listings created: ${listing.created_at}`);
    console.log(`    property_details created:  ${details.created_at}`);
  }
}

main().catch(console.error);
