import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkEE2Data() {
  console.log('🔍 EE2のデータを確認中...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // property_listingsテーブルからEE2を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'EE2')
      .single();

    if (propertyError) {
      console.error('❌ property_listingsエラー:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ EE2が見つかりません');
      return;
    }

    console.log('✅ property_listings:');
    console.log('- property_number:', property.property_number);
    console.log('- atbb_status:', property.atbb_status);
    console.log('- latitude:', property.latitude);
    console.log('- longitude:', property.longitude);
    console.log('- address:', property.address);
    console.log('- price:', property.price);
    console.log('- property_type:', property.property_type);
    console.log('- storage_location:', property.storage_location || '(なし)');
    console.log('- image_url:', property.image_url || '(なし)');

    // 地図表示の条件を確認
    console.log('\n📋 地図表示の条件:');
    console.log('- 座標あり:', property.latitude && property.longitude ? '✅' : '❌');
    
    // リスト表示の条件を確認
    console.log('\n📋 リスト表示の条件:');
    console.log('- atbb_statusが公開可能:', property.atbb_status ? '✅' : '❌');
    
    // 画像取得の可能性を確認
    console.log('\n📋 画像取得:');
    console.log('- image_urlあり:', property.image_url ? '✅' : '❌');
    console.log('- storage_locationあり:', property.storage_location ? '✅' : '❌');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkEE2Data();
