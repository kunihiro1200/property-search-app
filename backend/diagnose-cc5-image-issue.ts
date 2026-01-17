// CC5の画像取得問題を診断
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

async function diagnoseCC5ImageIssue() {
  console.log('=== CC5画像取得問題の診断 ===\n');

  const propertyNumber = 'CC5';

  // Supabaseクライアント初期化
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. CC5のデータを取得
    console.log('1. CC5のデータを取得...');
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, image_url, storage_location, atbb_status')
      .eq('property_number', propertyNumber)
      .single();

    if (fetchError) {
      throw new Error(`物件の取得に失敗: ${fetchError.message}`);
    }

    console.log('物件ID:', property.id);
    console.log('物件番号:', property.property_number);
    console.log('image_url:', property.image_url || '(空)');
    console.log('storage_location:', property.storage_location || '(空)');
    console.log('atbb_status:', property.atbb_status || '(空)');
    console.log('');

    // 2. 画像取得フローの確認
    console.log('2. 画像取得フローの確認...');
    
    if (property.image_url) {
      console.log('✅ image_urlが存在します');
      console.log('   → このURLが使用されるはずです:', property.image_url);
    } else if (property.storage_location) {
      console.log('✅ storage_locationが存在します');
      console.log('   → Google Driveから画像を取得します');
      console.log('');

      // 3. PropertyImageServiceで画像を取得してみる
      console.log('3. PropertyImageServiceで画像を取得...');
      const propertyImageService = new PropertyImageService();
      
      try {
        const images = await propertyImageService.getFirstImage(
          property.id,
          property.storage_location
        );
        
        console.log(`✅ 画像取得成功: ${images.length}件`);
        if (images.length > 0) {
          console.log('最初の画像URL:', images[0]);
        }
      } catch (imageError: any) {
        console.error('❌ 画像取得失敗:', imageError.message);
        console.log('');
        console.log('エラー詳細:');
        console.log(imageError);
      }
    } else {
      console.log('❌ image_urlもstorage_locationも存在しません');
    }

    console.log('');
    console.log('=== 診断完了 ===');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  }
}

diagnoseCC5ImageIssue()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n処理中にエラーが発生しました:', error);
    process.exit(1);
  });
