import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyService } from './src/services/PropertyService';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA2507_1() {
  console.log('=== AA2507-1 テスト ===\n');

  try {
    // 1. 現在の状態を確認
    console.log('1. 現在の状態を確認中...');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .eq('property_number', 'AA2507-1')
      .single();

    if (propertyError) {
      console.error('❌ 物件取得エラー:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ 物件が見つかりません: AA2507-1');
      return;
    }

    console.log('✅ 物件情報:');
    console.log('  - 物件番号:', property.property_number);
    console.log('  - 物件ID:', property.id);
    console.log('  - ATBB状況:', property.atbb_status);
    console.log('  - 格納先URL（現在）:', property.storage_location || '未設定');
    console.log('');

    // 2. 格納先URLを取得
    console.log('2. Google Driveから格納先URLを取得中...');
    const propertyService = new PropertyService();
    const storageUrl = await propertyService.retrieveStorageUrl(property.property_number);

    if (storageUrl) {
      console.log('✅ 格納先URLを取得しました:');
      console.log(`   ${storageUrl}`);
      console.log('');
      console.log('✅ データベースに保存しました');
      console.log('');

      // 3. 画像を取得してみる
      console.log('3. 画像を取得中...');
      const imageService = new PropertyImageService();
      const result = await imageService.getImagesFromStorageUrl(storageUrl);

      console.log('✅ 画像取得結果:');
      console.log('  - 使用されたフォルダID:', result.folderId);
      console.log('  - 画像数:', result.images.length);
      
      if (result.images.length > 0) {
        console.log('  - 最初の画像:', result.images[0].name);
      }
      console.log('');

      // 4. 公開物件サイトのURL
      console.log('=== テスト完了 ===');
      console.log('✅ 格納先URLの取得と保存が成功しました！');
      console.log('');
      console.log('📱 公開物件サイトで確認してください：');
      console.log(`   物件ID: ${property.id}`);
      console.log(`   URL: http://localhost:3000/properties/${property.id}`);
      console.log('');
      console.log('画像が表示されるはずです！');

    } else {
      console.log('❌ 格納先URLが見つかりませんでした');
      console.log('Google Driveに物件番号のフォルダが存在しない可能性があります。');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testAA2507_1();
