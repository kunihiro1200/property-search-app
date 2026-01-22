import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA5128_2Images() {
  console.log('=== AA5128-2 画像診断 ===\n');

  try {
    // 1. データベースから物件情報を取得
    console.log('1. データベースから物件情報を取得中...');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA5128-2')
      .single();

    if (propertyError) {
      console.error('❌ 物件取得エラー:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ 物件が見つかりません: AA5128-2');
      return;
    }

    console.log('✅ 物件情報:');
    console.log('  - 物件番号:', property.property_number);
    console.log('  - 物件ID:', property.id);
    console.log('  - 格納先URL:', property.storage_location || '未設定');
    console.log('  - ATBB状態:', property.atbb_status || '未設定');
    console.log('');

    // 2. 格納先URLの確認
    if (!property.storage_location) {
      console.error('❌ 格納先URLが設定されていません');
      return;
    }

    // 3. PropertyImageServiceで画像を取得
    console.log('2. PropertyImageServiceで画像を取得中...');
    const imageService = new PropertyImageService();
    
    // フォルダIDを抽出
    const folderId = imageService.extractFolderIdFromUrl(property.storage_location);
    console.log('  - 抽出されたフォルダID:', folderId);
    console.log('');

    // 画像を取得
    console.log('3. 画像を取得中...');
    const result = await imageService.getImagesFromStorageUrl(property.storage_location);
    
    console.log('✅ 画像取得結果:');
    console.log('  - 使用されたフォルダID:', result.folderId);
    console.log('  - キャッシュから取得:', result.cached);
    console.log('  - 画像数:', result.images.length);
    console.log('');

    if (result.images.length === 0) {
      console.error('❌ 画像が見つかりません');
      console.log('');
      console.log('考えられる原因:');
      console.log('  1. "athome公開"フォルダが存在しない');
      console.log('  2. "athome公開"フォルダ内に画像がない');
      console.log('  3. サービスアカウントに権限がない');
      console.log('  4. フォルダIDが間違っている');
    } else {
      console.log('✅ 画像一覧:');
      result.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     - ID: ${img.id}`);
        console.log(`     - サムネイルURL: ${img.thumbnailUrl}`);
        console.log(`     - フル画像URL: ${img.fullImageUrl}`);
      });
    }
    console.log('');

    // 4. 公開物件サイト用のAPIエンドポイントをテスト
    console.log('4. 公開物件サイト用のAPIをテスト中...');
    const { data: publicProperty, error: publicError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .eq('property_number', 'AA5128-2')
      .single();

    if (publicError) {
      console.error('❌ 公開物件取得エラー:', publicError);
    } else {
      console.log('✅ 公開物件APIレスポンス:');
      console.log('  - 物件ID:', publicProperty.id);
      console.log('  - 物件番号:', publicProperty.property_number);
      console.log('  - 格納先URL:', publicProperty.storage_location);
      console.log('  - ATBB状態:', publicProperty.atbb_status);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkAA5128_2Images();
