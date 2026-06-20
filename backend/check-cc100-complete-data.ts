import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCC100CompleteData() {
  console.log('=== CC100の完全データ確認 ===\n');

  // property_listingsテーブルを確認
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC100')
    .single();

  if (propertyError) {
    console.error('❌ property_listingsエラー:', propertyError);
    return;
  }

  console.log('✅ property_listings:');
  console.log(`   UUID: ${property.id}`);
  console.log(`   物件番号: ${property.property_number}`);
  console.log(`   格納先URL: ${property.storage_location}`);
  console.log('');

  // property_detailsテーブルを確認
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC100')
    .single();

  if (detailsError && detailsError.code !== 'PGRST116') {
    console.error('❌ property_detailsエラー:', detailsError);
  } else if (!details) {
    console.log('❌ property_detailsテーブルにCC100のデータが存在しません\n');
  } else {
    console.log('✅ property_details:');
    console.log(`   favorite_comment: ${details.favorite_comment ? '存在する' : 'null'}`);
    console.log(`   recommended_comments: ${details.recommended_comments ? `存在する (${Array.isArray(details.recommended_comments) ? details.recommended_comments.length : 0}件)` : 'null'}`);
    console.log(`   property_about: ${details.property_about ? '存在する' : 'null'}`);
    console.log(`   athome_data: ${details.athome_data ? `存在する (${Array.isArray(details.athome_data) ? details.athome_data.length : 0}件)` : 'null'}`);
    
    if (details.athome_data && Array.isArray(details.athome_data) && details.athome_data.length > 0) {
      console.log(`   パノラマURL (athome_data[1]): ${details.athome_data[1] || 'null'}`);
    }
    
    console.log('\n   詳細データ:');
    console.log(`   favorite_comment: ${details.favorite_comment || 'null'}`);
    console.log(`   recommended_comments: ${JSON.stringify(details.recommended_comments, null, 2)}`);
    console.log(`   property_about: ${details.property_about || 'null'}`);
    console.log(`   athome_data: ${JSON.stringify(details.athome_data, null, 2)}`);
  }
}

checkCC100CompleteData()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
