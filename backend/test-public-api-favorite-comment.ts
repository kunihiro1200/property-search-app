// 公開物件APIでfavorite_commentが返されるか確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testPublicAPI() {
  console.log('🔍 Testing public API for favorite_comment...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // テスト物件のIDを取得
  const testProperties = ['CC20', 'CC16', 'AA13341', 'CC14'];
  
  for (const propertyNumber of testProperties) {
    // property_listingsからIDを取得
    const { data: property } = await supabase
      .from('property_listings')
      .select('id, property_number')
      .eq('property_number', propertyNumber)
      .single();
    
    if (!property) {
      console.log(`❌ ${propertyNumber}: Not found in property_listings`);
      continue;
    }
    
    console.log(`\n📝 ${propertyNumber} (ID: ${property.id}):`);
    
    // property_detailsから取得
    const { data: details } = await supabase
      .from('property_details')
      .select('favorite_comment, property_about, recommended_comments, athome_data')
      .eq('property_number', propertyNumber)
      .single();
    
    if (details) {
      console.log(`   ✅ property_details found:`);
      console.log(`      favorite_comment: ${details.favorite_comment ? `"${details.favorite_comment.substring(0, 60)}..."` : 'NULL'}`);
      console.log(`      property_about: ${details.property_about ? 'EXISTS' : 'NULL'}`);
      console.log(`      recommended_comments: ${details.recommended_comments ? `${details.recommended_comments.length} items` : 'NULL'}`);
      console.log(`      athome_data: ${details.athome_data ? `${details.athome_data.length} items` : 'NULL'}`);
    } else {
      console.log(`   ❌ property_details not found`);
    }
  }
  
  console.log('\n\n✅ Test complete!');
  console.log('\n📌 Next step: Open the public property site and check if favorite_comment is displayed');
  console.log('   URL example: http://localhost:3001/properties/{property_id}');
  
  process.exit(0);
}

testPublicAPI();
