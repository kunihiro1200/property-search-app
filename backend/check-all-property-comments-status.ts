import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllPropertyCommentsStatus() {
  console.log('🔍 Checking all property comments status...\n');
  
  // property_detailsテーブルから全物件を取得
  const { data: allDetails, error } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, athome_data, property_about')
    .order('property_number', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!allDetails || allDetails.length === 0) {
    console.log('❌ No property details found');
    return;
  }
  
  console.log(`✅ Found ${allDetails.length} properties in property_details\n`);
  
  // コメントデータの状況を集計
  let totalProperties = allDetails.length;
  let hasFavoriteComment = 0;
  let hasRecommendedComments = 0;
  let hasAthomeData = 0;
  let hasPropertyAbout = 0;
  let emptyComments = 0;
  
  const emptyCommentProperties: string[] = [];
  
  for (const detail of allDetails) {
    if (detail.favorite_comment) hasFavoriteComment++;
    if (detail.recommended_comments && Array.isArray(detail.recommended_comments) && detail.recommended_comments.length > 0) {
      hasRecommendedComments++;
    }
    if (detail.athome_data && Array.isArray(detail.athome_data) && detail.athome_data.length > 0) {
      hasAthomeData++;
    }
    if (detail.property_about) hasPropertyAbout++;
    
    // コメントデータが空の物件
    if (!detail.favorite_comment && 
        (!detail.recommended_comments || detail.recommended_comments.length === 0)) {
      emptyComments++;
      emptyCommentProperties.push(detail.property_number);
    }
  }
  
  console.log('📊 Summary:');
  console.log(`- Total properties: ${totalProperties}`);
  console.log(`- Has favorite_comment: ${hasFavoriteComment} (${(hasFavoriteComment / totalProperties * 100).toFixed(1)}%)`);
  console.log(`- Has recommended_comments: ${hasRecommendedComments} (${(hasRecommendedComments / totalProperties * 100).toFixed(1)}%)`);
  console.log(`- Has athome_data: ${hasAthomeData} (${(hasAthomeData / totalProperties * 100).toFixed(1)}%)`);
  console.log(`- Has property_about: ${hasPropertyAbout} (${(hasPropertyAbout / totalProperties * 100).toFixed(1)}%)`);
  console.log(`- Empty comments: ${emptyComments} (${(emptyComments / totalProperties * 100).toFixed(1)}%)`);
  
  if (emptyCommentProperties.length > 0) {
    console.log(`\n🚨 Properties with empty comments (${emptyCommentProperties.length}):`);
    console.log(emptyCommentProperties.slice(0, 20).join(', '));
    if (emptyCommentProperties.length > 20) {
      console.log(`... and ${emptyCommentProperties.length - 20} more`);
    }
  }
}

checkAllPropertyCommentsStatus().catch(console.error);
