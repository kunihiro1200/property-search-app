import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config({ path: '.env.local' });

async function diagnoseImagesAPI() {
  console.log('=== AA9743 画像API診断 ===\n');
  
  const propertyListingService = new PropertyListingService();
  const propertyImageService = new PropertyImageService();
  
  try {
    // 1. 物件情報を取得
    console.log('1. 物件情報を取得中...');
    const property = await propertyListingService.getPublicPropertyByNumber('AA9743');
    
    if (!property) {
      console.error('❌ 物件が見つかりません');
      return;
    }
    
    console.log('✅ 物件情報:', {
      property_number: property.property_number,
      has_storage_location: !!property.storage_location,
      storage_location: property.storage_location,
      has_athome_data: !!property.athome_data,
      athome_data_length: Array.isArray(property.athome_data) ? property.athome_data.length : 0,
      athome_data_first: Array.isArray(property.athome_data) && property.athome_data.length > 0 ? property.athome_data[0] : null
    });
    
    // 2. storage_urlを決定
    console.log('\n2. storage_urlを決定中...');
    let storageUrl = property.storage_location;
    
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
      storageUrl = property.athome_data[0];
      console.log('✅ athome_dataからstorage_urlを取得:', storageUrl);
    } else if (storageUrl) {
      console.log('✅ storage_locationを使用:', storageUrl);
    } else {
      console.error('❌ storage_urlが見つかりません');
      return;
    }
    
    // 3. フォルダIDを抽出
    console.log('\n3. フォルダIDを抽出中...');
    const folderId = propertyImageService['extractFolderIdFromUrl'](storageUrl);
    
    if (!folderId) {
      console.error('❌ フォルダIDを抽出できません:', storageUrl);
      return;
    }
    
    console.log('✅ フォルダID:', folderId);
    
    // 4. 画像を取得
    console.log('\n4. 画像を取得中...');
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
    
    console.log('✅ 画像取得結果:', {
      images_count: result.images.length,
      folderId: result.folderId,
      cached: result.cached,
      first_image: result.images.length > 0 ? {
        id: result.images[0].id,
        name: result.images[0].name,
        thumbnailUrl: result.images[0].thumbnailUrl
      } : null
    });
    
    if (result.images.length === 0) {
      console.warn('⚠️ 画像が見つかりません');
    }
    
    // 5. 非表示画像リストを取得
    console.log('\n5. 非表示画像リストを取得中...');
    try {
      const hiddenImages = await propertyListingService.getHiddenImages(property.id);
      console.log('✅ 非表示画像:', hiddenImages.length > 0 ? hiddenImages : '(なし)');
    } catch (error: any) {
      console.warn('⚠️ 非表示画像リストの取得に失敗:', error.message);
    }
    
    console.log('\n=== 診断完了 ===');
    
  } catch (error: any) {
    console.error('\n❌ エラー発生:', error);
    console.error('スタックトレース:', error.stack);
  }
}

diagnoseImagesAPI();
