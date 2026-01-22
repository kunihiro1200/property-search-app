require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function listPropertiesWithImages() {
  console.log('🖼️  画像URLが設定されている物件を確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 画像URLが設定されている物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, address, image_url')
      .not('image_url', 'is', null)
      .order('property_number', { ascending: true });

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 画像URLが設定されている物件: ${properties?.length || 0}件\n`);

    properties?.forEach((prop, index) => {
      try {
        const urls = JSON.parse(prop.image_url);
        console.log(`${index + 1}. ${prop.property_number} - ${urls.length}枚`);
      } catch (e) {
        console.log(`${index + 1}. ${prop.property_number} - JSONパースエラー`);
      }
    });

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

listPropertiesWithImages();
