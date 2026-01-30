/**
 * AA13407の「こちらの物件について」（property_about）を確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13407PropertyAbout() {
  console.log('=== AA13407 「こちらの物件について」確認 ===\n');
  
  // property_listingsテーブルを確認
  const { data: listings, error: listingsError } = await supabase
    .from('property_listings')
    .select('property_number, property_type, atbb_status, property_about')
    .eq('property_number', 'AA13407');
  
  console.log('📋 property_listings テーブル:');
  if (listingsError) {
    console.log('  Error:', listingsError);
  } else if (listings && listings.length > 0) {
    console.log('  property_number:', listings[0].property_number);
    console.log('  property_type:', listings[0].property_type || '(空)');
    console.log('  atbb_status:', listings[0].atbb_status || '(空)');
    console.log('  property_about:', listings[0].property_about ? '✅ あり' : '❌ なし');
    if (listings[0].property_about) {
      console.log('    内容:', listings[0].property_about.substring(0, 100) + '...');
    }
  } else {
    console.log('  ❌ AA13407 not found in property_listings');
  }
  
  // property_detailsテーブルも確認
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('property_number, property_about')
    .eq('property_number', 'AA13407');
  
  console.log('\n📋 property_details テーブル:');
  if (detailsError) {
    console.log('  Error:', detailsError);
  } else if (details && details.length > 0) {
    console.log('  property_about:', details[0].property_about ? '✅ あり' : '❌ なし');
    if (details[0].property_about) {
      console.log('    内容:', details[0].property_about.substring(0, 100) + '...');
    }
  } else {
    console.log('  ❌ AA13407 not found in property_details');
  }
}

checkAA13407PropertyAbout().catch(console.error);
