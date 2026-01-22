import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPublicApiAA2507_1() {
  console.log('=== AA2507-1 公開物件API テスト ===\n');

  try {
    // 1. 物件IDを取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .eq('property_number', 'AA2507-1')
      .single();

    if (error || !property) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    console.log('物件情報:');
    console.log('  - 物件ID:', property.id);
    console.log('  - 物件番号:', property.property_number);
    console.log('  - ATBB状況:', property.atbb_status);
    console.log('  - 格納先URL:', property.storage_location);
    console.log('');

    // 2. 公開物件APIをテスト
    console.log('公開物件APIで取得中...');
    const propertyListingService = new PropertyListingService();
    const publicProperty = await propertyListingService.getPublicPropertyById(property.id);

    if (!publicProperty) {
      console.error('❌ 公開物件APIで物件が見つかりません');
      console.log('');
      console.log('考えられる原因:');
      console.log('  - ATBB状況がクリック可能でない');
      console.log('  - 物件が削除されている');
      return;
    }

    console.log('✅ 公開物件APIで取得成功');
    console.log('  - 物件番号:', publicProperty.property_number);
    console.log('  - 格納先URL:', publicProperty.storage_location);
    console.log('');

    // 3. 画像URLを確認
    console.log('画像URL:');
    if (publicProperty.images && publicProperty.images.length > 0) {
      console.log(`  ✅ ${publicProperty.images.length}件の画像URL`);
      publicProperty.images.forEach((url, index) => {
        console.log(`    ${index + 1}. ${url}`);
      });
    } else {
      console.log('  ❌ 画像URLがありません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testPublicApiAA2507_1();
