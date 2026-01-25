// 全物件のimage_urlをバックフィル（高速版）
// これを一度実行すれば、以降は高速＋画像表示の両方が実現できる

import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const propertyImageService = new PropertyImageService(60, 60, 2, 3);

async function backfillAllImageUrls() {
  try {
    console.log('🚀 Starting image_url backfill...');
    
    // 1. 業務リスト（業務依頼）を一度だけ読み込む
    console.log('📋 Loading 業務リスト（業務依頼）...');
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    const rows = await gyomuListClient.readAll();
    
    // 物件番号 → storage_urlのマップを作成
    const storageUrlMap = new Map<string, string>();
    for (const row of rows) {
      const propNumber = row['物件番号'];
      const storageUrl = row['格納先URL'];
      if (propNumber && storageUrl) {
        storageUrlMap.set(propNumber as string, storageUrl as string);
      }
    }
    console.log(`✅ Loaded ${storageUrlMap.size} entries from 業務リスト（業務依頼）`);
    
    // 2. image_urlが空の物件を取得
    console.log('🔍 Fetching properties without image_url...');
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, image_url, storage_location')
      .or('image_url.is.null,image_url.eq.')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
    
    console.log(`📊 Found ${properties?.length || 0} properties without image_url`);
    
    if (!properties || properties.length === 0) {
      console.log('✅ All properties already have image_url!');
      return;
    }
    
    // 3. 並列処理でimage_urlを取得・保存
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const concurrencyLimit = 10; // 並列処理数
    
    for (let i = 0; i < properties.length; i += concurrencyLimit) {
      const batch = properties.slice(i, i + concurrencyLimit);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(properties.length / concurrencyLimit)} (${i + 1}-${Math.min(i + concurrencyLimit, properties.length)}/${properties.length})`);
      
      await Promise.all(
        batch.map(async (property) => {
          try {
            // storage_locationを取得（データベース → 業務リスト）
            let storageLocation = property.storage_location;
            if (!storageLocation && property.property_number) {
              storageLocation = storageUrlMap.get(property.property_number) || null;
            }
            
            if (!storageLocation) {
              console.log(`⏭️  ${property.property_number}: No storage_location, skipping`);
              skipCount++;
              return;
            }
            
            // Google Driveから画像を取得
            const imageResult = await propertyImageService.getImagesFromStorageUrl(storageLocation);
            
            if (imageResult.images.length === 0) {
              console.log(`⏭️  ${property.property_number}: No images found, skipping`);
              skipCount++;
              return;
            }
            
            // 最初の画像のURLを取得
            const firstImageUrl = imageResult.images[0].thumbnailUrl;
            
            // データベースに保存
            const { error: updateError } = await supabase
              .from('property_listings')
              .update({ image_url: firstImageUrl })
              .eq('id', property.id);
            
            if (updateError) {
              console.error(`❌ ${property.property_number}: Failed to update - ${updateError.message}`);
              errorCount++;
              return;
            }
            
            console.log(`✅ ${property.property_number}: Updated image_url`);
            successCount++;
          } catch (error: any) {
            console.error(`❌ ${property.property_number}: Error - ${error.message}`);
            errorCount++;
          }
        })
      );
      
      // 進捗表示
      console.log(`📊 Progress: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
      
      // レート制限対策（少し待機）
      if (i + concurrencyLimit < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Backfill completed!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${properties.length}`);
    
  } catch (error: any) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

// 実行
backfillAllImageUrls()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
