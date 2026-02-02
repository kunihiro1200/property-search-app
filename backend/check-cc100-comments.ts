import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC100Comments() {
  console.log('🔍 Checking CC100 comment data...\n');
  
  // property_detailsテーブルから取得
  const { data: details, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC100')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!details) {
    console.log('❌ CC100 not found in property_details');
    return;
  }
  
  console.log('✅ CC100 found in property_details');
  console.log('\n📊 Comment data:');
  console.log('- favorite_comment:', details.favorite_comment ? `"${details.favorite_comment}"` : 'NULL');
  console.log('- recommended_comments:', details.recommended_comments ? JSON.stringify(details.recommended_comments, null, 2) : 'NULL');
  console.log('- athome_data:', details.athome_data ? JSON.stringify(details.athome_data, null, 2) : 'NULL');
  console.log('- property_about:', details.property_about ? `"${details.property_about.substring(0, 100)}..."` : 'NULL');
  
  // property_listingsテーブルから物件種別を確認
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_type')
    .eq('property_number', 'CC100')
    .single();
  
  if (propertyError) {
    console.error('❌ Error fetching property:', propertyError);
    return;
  }
  
  console.log('\n📋 Property info:');
  console.log('- property_type:', property.property_type);
}

checkCC100Comments().catch(console.error);
