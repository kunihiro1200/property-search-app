// 公開物件サイトの画像表示問題を診断するスクリプト
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyImageService } from './src/services/PropertyImageService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function diagnose() {
  console.log('🔍 公開物件サイトの画像表示問題を診断中...\n');
  
  // 環境変数の確認
  console.log('📋 環境変数の確認:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '未設定'}`);
  console.log('');
  
  // Supabaseクライアントの初期化
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // Step 1: データベースから物件を取得
  console.log('📊 Step 1: データベースから物件を取得...');
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, image_url, atbb_status')
    .limit(5);
  
  if (error) {
    console.error('❌ データベースエラー:', error);
    return;
  }
  
  console.log(`  取得した物件数: ${properties?.length || 0}`);
  console.log('');
  
  // Step 2: 各物件のstorage_locationを確認
  console.log('📋 Step 2: 各物件のstorage_locationを確認...');
  for (const prop of properties || []) {
    console.log(`  ${prop.property_number}:`);
    console.log(`    - storage_location: ${prop.storage_location || '(空)'}`);
    console.log(`    - image_url: ${prop.image_url || '(空)'}`);
    console.log(`    - atbb_status: ${prop.atbb_status || '(空)'}`);
  }
  console.log('');
  
  // Step 3: PropertyImageServiceで画像を取得
  console.log('📸 Step 3: PropertyImageServiceで画像を取得...');
  const propertyImageService = new PropertyImageService();
  
  for (const prop of properties || []) {
    if (prop.storage_location) {
      console.log(`\n  ${prop.property_number} の画像を取得中...`);
      try {
        const result = await propertyImageService.getImagesFromStorageUrl(prop.storage_location);
        console.log(`    ✅ 取得成功: ${result.images.length}枚`);
        if (result.images.length > 0) {
          console.log(`    最初の画像: ${result.images[0].thumbnailUrl}`);
        }
      } catch (err: any) {
        console.error(`    ❌ エラー: ${err.message}`);
      }
    } else {
      console.log(`\n  ${prop.property_number}: storage_locationが空のためスキップ`);
    }
  }
  console.log('');
  
  // Step 4: PropertyListingServiceのgetPublicPropertiesを呼び出し
  console.log('📊 Step 4: PropertyListingService.getPublicProperties()を呼び出し...');
  const propertyListingService = new PropertyListingService();
  
  try {
    const result = await propertyListingService.getPublicProperties({
      limit: 3,
      offset: 0,
      skipImages: false,
    });
    
    console.log(`  取得した物件数: ${result.properties.length}`);
    console.log(`  合計: ${result.pagination.total}`);
    console.log('');
    
    for (const prop of result.properties) {
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
