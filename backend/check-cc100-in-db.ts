import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCC100InDB() {
  console.log('=== CC100のデータベース確認 ===\n');

  // property_listingsテーブルを確認
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC100')
    .single();

  if (propertyError && propertyError.code !== 'PGRST116') {
    console.error('❌ エラー:', propertyError);
  } else if (!property) {
    console.log('❌ CC100はproperty_listingsテーブルに存在しません\n');
    
    // 最近作成された物件を確認
    console.log('最近作成された物件（最新10件）:');
    const { data: recentProperties, error: recentError } = await supabase
      .from('property_listings')
      .select('property_number, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('   エラー:', recentError);
    } else if (recentProperties) {
      recentProperties.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.property_number}: ${prop.created_at}`);
      });
    }
  } else {
    console.log('✅ CC100がproperty_listingsテーブルに存在します:');
    console.log(`   作成日時: ${property.created_at}`);
    console.log(`   更新日時: ${property.updated_at}`);
    console.log(`   売主ID: ${property.seller_id}`);
    console.log(`   格納先URL: ${property.storage_location}`);
  }
  
  console.log('');
}

checkCC100InDB()
  .then(() => {
    console.log('✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
