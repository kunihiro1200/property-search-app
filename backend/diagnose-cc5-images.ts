// CC5の画像取得を診断するスクリプト
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyImageService } from './src/services/PropertyImageService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function diagnose() {
  console.log('🔍 CC5の画像取得を診断中...\n');
  
  // Supabaseクライアントの初期化
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // Step 1: CC5の物件情報を取得
  console.log('📊 Step 1: CC5の物件情報を取得...');
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, image_url, atbb_status')
    .eq('property_number', 'CC5')
    .single();
  
  if (error) {
    console.error('❌ データベースエラー:', error);
    return;
  }
  
  console.log('  物件情報:');
  console.log(`    - property_number: ${property.property_number}`);
  console.log(`    - storage_location: ${property.storage_location || '(空)'}`);
  console.log(`    - image_url: ${property.image_url || '(空)'}`);
  console.log(`    - atbb_status: ${property.atbb_status || '(空)'}`);
  console.log('');
  
  // Step 2: PropertyImageServiceで画像を取得
  console.log('📸 Step 2: PropertyImageServiceで画像を取得...');
  const propertyImageService = new PropertyImageService();
  
  if (property.storage_location) {
    try {
      const result = await propertyImageService.getImagesFromStorageUrl(property.storage_location);
      console.log(`  ✅ 取得成功: ${result.images.length}枚`);
      console.log(`  フォルダID: ${result.folderId}`);
      console.log(`  キャッシュ: ${result.cached}`);
      if (result.images.length > 0) {
        console.log(`  最初の画像:`);
        console.log(`    - id: ${result.images[0].id}`);
        console.log(`    - name: ${result.images[0].name}`);
        console.log(`    - thumbnailUrl: ${result.images[0].thumbnailUrl}`);
      }
    } catch (err: any) {
      console.error(`  ❌ エラー: ${err.message}`);
      console.error(`  スタック: ${err.stack}`);
    }
  } else {
    console.log('  storage_locationが空のためスキップ');
  }
  console.log('');
  
  // Step 3: PropertyListingServiceのgetPublicPropertiesでCC5を検索
  console.log('📊 Step 3: PropertyListingService.getPublicProperties()でCC5を検索...');
  const propertyListingService = new PropertyListingService();
  
  try {
    const result = await propertyListingService.getPublicProperties({
      limit: 1,
      offset: 0,
      propertyNumber: 'CC5',
      skipImages: false,
    });
    
    console.log(`  取得した物件数: ${result.properties.length}`);
    
    if (result.properties.length > 0) {
      const prop = result.properties[0];
      console.log(`  ${prop.property_number}:`);
      console.log(`    - images: ${prop.images?.length || 0}枚`);
      if (prop.images && prop.images.length > 0) {
        console.log(`    - 最初の画像: ${prop.images[0].thumbnailUrl}`);
      }
    }
  } catch (err: any) {
    console.error('❌ PropertyListingServiceエラー:', err.message);
    console.error('スタック:', err.stack);
  }
  
  console.log('\n✅ 診断完了');
}

diagnose().catch(console.error);
