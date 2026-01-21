import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const propertyImageService = new PropertyImageService();

async function populateCC24ImageUrl() {
  console.log('=== CC24の画像URL取得スクリプト ===\n');

  try {
    // CC24の物件データを取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, image_url')
      .eq('property_number', 'CC24')
      .single();

    if (error) {
      console.error('物件データの取得に失敗しました:', error);
      return;
    }

    console.log('CC24データ:');
    console.log('- property_number:', property.property_number);
    console.log('- storage_location:', property.storage_location);
    console.log('- image_url (現在):', property.image_url);
    console.log('\n');

    if (!property.storage_location) {
      console.error('❌ storage_locationが設定されていません');
      return;
    }

    console.log('Google Driveから画像URLを取得中...\n');

    // Google Driveから画像URLを取得
    const result = await propertyImageService.getImagesFromStorageUrl(property.storage_location);

    console.log('取得結果:');
    console.log('- 画像数:', result.images.length);
    console.log('- フォルダID:', result.folderId);
    console.log('\n');

    if (result.images.length > 0) {
      console.log('=== 画像URL一覧 ===');
      result.images.forEach((img, index) => {
        console.log(`${index + 1}. ${img.name}`);
        console.log(`   Thumbnail URL: ${img.thumbnailUrl}`);
        console.log(`   Full Image URL: ${img.fullImageUrl}`);
        console.log(`   ID: ${img.id}`);
        console.log('');
      });

      // 最初の画像のフルURLをimage_urlに保存
      const firstImageUrl = result.images[0].fullImageUrl;
      
      console.log(`\n最初の画像URLをデータベースに保存します: ${firstImageUrl}\n`);
      
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({ image_url: firstImageUrl })
        .eq('id', property.id);

      if (updateError) {
        console.error('❌ 更新失敗:', updateError);
      } else {
        console.log('✅ 成功: CC24のimage_urlを更新しました');
        
        // 更新後のデータを確認
        const { data: updatedProperty } = await supabase
          .from('property_listings')
          .select('property_number, image_url')
          .eq('property_number', 'CC24')
          .single();
        
        console.log('\n更新後のデータ:');
        console.log('- property_number:', updatedProperty?.property_number);
        console.log('- image_url:', updatedProperty?.image_url);
      }
    } else {
      console.log('⚠️ 画像が見つかりませんでした');
    }

  } catch (error) {
    console.error('スクリプト実行中にエラーが発生しました:', error);
  }
}

// スクリプト実行
populateCC24ImageUrl()
  .then(() => {
    console.log('\nスクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nスクリプトがエラーで終了しました:', error);
    process.exit(1);
  });
