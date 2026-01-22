import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMissingStorageUrls() {
  console.log('=== 格納先URL未設定の物件を確認 ===\n');

  try {
    // storage_locationが空の物件を取得
    const { data: properties, error, count } = await supabase
      .from('property_listings')
      .select('id, property_number, atbb_status', { count: 'exact' })
      .is('storage_location', null);

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 統計:`);
    console.log(`  - 格納先URL未設定の物件数: ${count}件`);
    console.log('');

    if (properties && properties.length > 0) {
      console.log('未設定の物件（最初の20件）:');
      properties.slice(0, 20).forEach((prop, index) => {
        console.log(`  ${index + 1}. ${prop.property_number} (${prop.atbb_status || '状態未設定'})`);
      });
      
      if (properties.length > 20) {
        console.log(`  ... 他 ${properties.length - 20}件`);
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkMissingStorageUrls();
