require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkImageUrls() {
  console.log('🔍 画像URLの状況を確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 最初の10件の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, address, image_url, storage_location')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 最新の物件10件の画像URL状況:\n`);

    properties?.forEach((prop, index) => {
      console.log(`${index + 1}. 物件番号: ${prop.property_number}`);
      console.log(`   住所: ${prop.address}`);
      console.log(`   image_url: ${prop.image_url ? '✅ あり' : '❌ なし'}`);
      if (prop.image_url) {
        try {
          const urls = JSON.parse(prop.image_url);
          console.log(`   画像数: ${urls.length}枚`);
          if (urls.length > 0) {
            console.log(`   最初の画像URL: ${urls[0].substring(0, 80)}...`);
          }
        } catch (e) {
          console.log(`   ⚠️ JSONパースエラー`);
        }
      }
      console.log(`   storage_location: ${prop.storage_location ? '✅ あり' : '❌ なし'}`);
      if (prop.storage_location) {
        console.log(`   格納先: ${prop.storage_location.substring(0, 80)}...`);
      }
      console.log('');
    });

    // 画像URLがある物件の数を確認
    const { count: withImages, error: countError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .not('image_url', 'is', null);

    if (!countError) {
      console.log(`\n📷 画像URLが設定されている物件: ${withImages}件`);
    }

    // 全物件数
    const { count: total, error: totalError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (!totalError) {
      console.log(`📊 全物件数: ${total}件`);
      console.log(`📊 画像なし物件: ${(total || 0) - (withImages || 0)}件`);
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

checkImageUrls();
