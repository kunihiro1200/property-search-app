// AA13069のコメントデータを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13069Comments() {
  console.log('🔍 Checking AA13069 comment data...\n');

  // データベースの状態を確認
  const { data: details, error } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, property_about, athome_data')
    .eq('property_number', 'AA13069')
    .single();

  if (error) {
    console.error('❌ Error fetching from database:', error.message);
    return;
  }

  console.log('📊 Database State:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Property Number:', details?.property_number || 'null');
  console.log('\n1️⃣ Favorite Comment (お気に入り文言):');
  console.log(details?.favorite_comment || '❌ null');
  
  console.log('\n2️⃣ Recommended Comments (アピールポイント):');
  if (details?.recommended_comments && Array.isArray(details.recommended_comments)) {
    console.log(`✅ ${details.recommended_comments.length}件`);
    details.recommended_comments.forEach((comment: string, index: number) => {
      console.log(`  ${index + 1}. ${comment}`);
    });
  } else {
    console.log('❌ null or empty');
  }
  
  console.log('\n3️⃣ Property About (こちらの物件について):');
  console.log(details?.property_about || '❌ null');
  
  console.log('\n4️⃣ Athome Data (パノラマURL):');
  if (details?.athome_data && Array.isArray(details.athome_data)) {
    console.log(`✅ ${details.athome_data.length}件`);
    details.athome_data.forEach((url: string, index: number) => {
      console.log(`  ${index + 1}. ${url}`);
    });
  } else {
    console.log('❌ null or empty');
  }

  // 物件種別を確認
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('property_type')
    .eq('property_number', 'AA13069')
    .single();

  if (propError) {
    console.error('\n❌ Error fetching property type:', propError.message);
    return;
  }

  console.log('\n📋 Property Type:', property?.property_type || 'unknown');

  // 分析
  console.log('\n🔍 Analysis:');
  console.log('─────────────────────────────────────────────────────────');
  
  const hasFavorite = !!details?.favorite_comment;
  const hasRecommended = details?.recommended_comments && Array.isArray(details.recommended_comments) && details.recommended_comments.length > 0;
  const hasPropertyAbout = !!details?.property_about;

  if (hasFavorite && !hasRecommended && !hasPropertyAbout) {
    console.log('⚠️  Partial sync detected:');
    console.log('   ✅ favorite_comment: EXISTS');
    console.log('   ❌ recommended_comments: MISSING');
    console.log('   ❌ property_about: MISSING');
    console.log('\n💡 Possible causes:');
    console.log('   1. Spreadsheet data is missing for recommended_comments');
    console.log('   2. Spreadsheet data is missing for property_about');
    console.log('   3. Sync process was interrupted');
    console.log('   4. Cell positions are incorrect for this property type');
  }
}

checkAA13069Comments().catch(console.error);
