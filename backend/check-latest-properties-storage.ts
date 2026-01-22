import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkLatestPropertiesStorage() {
  console.log('🔍 最新物件のstorage_locationを確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 最新の物件10件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, storage_location, image_url')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 最新の物件20件:\n`);

    properties?.forEach((prop: any, index: number) => {
      console.log(`${index + 1}. ${prop.property_number} (${prop.atbb_status || '未設定'})`);
      console.log(`   storage_location: ${prop.storage_location ? '✅ 設定済み' : '❌ 未設定'}`);
      console.log(`   image_url: ${prop.image_url ? '✅ 設定済み' : '❌ 未設定'}`);
      if (prop.storage_location) {
        console.log(`   URL: ${prop.storage_location.substring(0, 80)}...`);
      }
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkLatestPropertiesStorage();
