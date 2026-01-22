// property_detailsテーブルの現在の状態を確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkStatus() {
  console.log('🔍 Checking property_details table status...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // 今日同期した物件を確認
  console.log('📝 Checking synced properties (CC20, CC16, AA13341, CC14):\n');
  const testProperties = ['CC20', 'CC16', 'AA13341', 'CC14'];
  
  for (const propertyNumber of testProperties) {
    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      console.log(`❌ ${propertyNumber}: ${error.message}`);
      continue;
    }
    
    console.log(`✅ ${propertyNumber}:`);
    console.log(`   property_about: ${data.property_about ? `✅ "${data.property_about.substring(0, 50)}..."` : '❌ NULL'}`);
    console.log(`   recommended_comments: ${data.recommended_comments && data.recommended_comments.length > 0 ? `✅ (${data.recommended_comments.length} items)` : '❌ NULL or empty'}`);
    console.log(`   athome_data: ${data.athome_data && data.athome_data.length > 0 ? `✅ (${data.athome_data.length} items)` : '❌ NULL or empty'}`);
    console.log(`   favorite_comment: ${data.favorite_comment ? `✅ "${data.favorite_comment.substring(0, 50)}..."` : '❌ NULL'}`);
    console.log(`   updated_at: ${data.updated_at || 'N/A'}`);
    console.log('');
  }
  
  // 全体の統計
  console.log('\n📊 Overall Statistics:\n');
  
  const { count: totalCount } = await supabase
    .from('property_details')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total records: ${totalCount}`);
  
  // 各フィールドの統計
  const { data: allRecords } = await supabase
    .from('property_details')
    .select('property_about, recommended_comments, athome_data, favorite_comment');
  
  if (allRecords) {
    let withPropertyAbout = 0;
    let withRecommendedComments = 0;
    let withAthomeData = 0;
    let withFavoriteComment = 0;
    
    allRecords.forEach(r => {
      if (r.property_about) withPropertyAbout++;
      if (r.recommended_comments && r.recommended_comments.length > 0) withRecommendedComments++;
      if (r.athome_data && r.athome_data.length > 0) withAthomeData++;
      if (r.favorite_comment) withFavoriteComment++;
    });
    
    console.log(`\nField Coverage:`);
    console.log(`  property_about:       ${withPropertyAbout}/${totalCount} (${Math.round(withPropertyAbout/totalCount*100)}%)`);
    console.log(`  recommended_comments: ${withRecommendedComments}/${totalCount} (${Math.round(withRecommendedComments/totalCount*100)}%)`);
    console.log(`  athome_data:          ${withAthomeData}/${totalCount} (${Math.round(withAthomeData/totalCount*100)}%)`);
    console.log(`  favorite_comment:     ${withFavoriteComment}/${totalCount} (${Math.round(withFavoriteComment/totalCount*100)}%)`);
  }
  
  process.exit(0);
}

checkStatus();
