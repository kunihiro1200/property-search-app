// property_detailsテーブルの全フィールドの状態を確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAllFields() {
  console.log('🔍 Checking all property_details fields...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // 公開中物件のproperty_detailsを取得
  const { data: properties, error } = await supabase
    .from('property_details')
    .select('property_number, property_about, recommended_comments, athome_data, favorite_comment')
    .limit(20);
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${properties?.length || 0} records in property_details\n`);
  
  // 統計情報
  let withPropertyAbout = 0;
  let withRecommendedComments = 0;
  let withAthomeData = 0;
  let withFavoriteComment = 0;
  let totalRecords = properties?.length || 0;
  
  properties?.forEach(p => {
    if (p.property_about) withPropertyAbout++;
    if (p.recommended_comments && p.recommended_comments.length > 0) withRecommendedComments++;
    if (p.athome_data && p.athome_data.length > 0) withAthomeData++;
    if (p.favorite_comment) withFavoriteComment++;
  });
  
  console.log('='.repeat(60));
  console.log('📊 FIELD COVERAGE (first 20 records)');
  console.log('='.repeat(60));
  console.log(`property_about:         ${withPropertyAbout}/${totalRecords} (${Math.round(withPropertyAbout/totalRecords*100)}%)`);
  console.log(`recommended_comments:   ${withRecommendedComments}/${totalRecords} (${Math.round(withRecommendedComments/totalRecords*100)}%)`);
  console.log(`athome_data:            ${withAthomeData}/${totalRecords} (${Math.round(withAthomeData/totalRecords*100)}%)`);
  console.log(`favorite_comment:       ${withFavoriteComment}/${totalRecords} (${Math.round(withFavoriteComment/totalRecords*100)}%)`);
  console.log('='.repeat(60));
  
  // サンプル表示
  console.log('\n📝 Sample Records:\n');
  properties?.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.property_number}:`);
    console.log(`   property_about: ${p.property_about ? '✅' : '❌'}`);
    console.log(`   recommended_comments: ${p.recommended_comments && p.recommended_comments.length > 0 ? `✅ (${p.recommended_comments.length} items)` : '❌'}`);
    console.log(`   athome_data: ${p.athome_data && p.athome_data.length > 0 ? `✅ (${p.athome_data.length} items)` : '❌'}`);
    console.log(`   favorite_comment: ${p.favorite_comment ? '✅' : '❌'}`);
    console.log('');
  });
  
  // 全体の統計
  const { count: totalCount } = await supabase
    .from('property_details')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total records in property_details: ${totalCount}`);
  
  process.exit(0);
}

checkAllFields();
