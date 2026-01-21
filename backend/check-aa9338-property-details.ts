import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAA9338PropertyDetails() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const propertyNumber = 'AA9338';
  
  console.log(`\n🔍 Checking property_details for ${propertyNumber}...`);
  
  // property_detailsテーブルから取得（複数行対応）
  const { data, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', propertyNumber)
    .order('created_at', { ascending: false }); // 最新のものを優先
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No data found in property_details table');
    return;
  }
  
  console.log(`\n✅ Found ${data.length} row(s) in property_details`);
  
  data.forEach((row: any, index: number) => {
    console.log(`\n--- Row ${index + 1} ---`);
    console.log('- property_number:', row.property_number);
    console.log('- favorite_comment:', row.favorite_comment || '(empty)');
    console.log('- recommended_comments:', row.recommended_comments ? `✅ ${row.recommended_comments.length} items` : '❌ Missing');
    console.log('- property_about:', row.property_about || '(empty)');
    console.log('- athome_data:', row.athome_data ? '✅ Exists' : '❌ Missing');
    
    if (row.recommended_comments) {
      console.log('\n📝 Recommended Comments:');
      row.recommended_comments.forEach((comment: any, idx: number) => {
        console.log(`  ${idx + 1}. ${comment}`);
      });
    }
    
    if (row.favorite_comment) {
      console.log('\n⭐ Favorite Comment:');
      console.log(`  ${row.favorite_comment}`);
    }
    
    if (row.property_about) {
      console.log('\n📄 Property About:');
      console.log(`  ${row.property_about}`);
    }
  });
}

checkAA9338PropertyDetails();
