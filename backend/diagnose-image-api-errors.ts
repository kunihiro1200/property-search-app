import { PropertyImageService } from './src/services/PropertyImageService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnose() {
  const imageService = new PropertyImageService();
  
  // 公開物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, image_url')
    .eq('atbb_status', '専任・公開中')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('❌ データベースエラー:', error.message);
    return;
  }
  
  console.log(`\n📊 診断開始: ${properties?.length || 0} 件の物件を確認\n`);
  console.log('='.repeat(80));
  
  let successCount = 0;
  let noStorageCount = 0;
  let emptyFolderCount = 0;
  let errorCount = 0;
  
  for (const property of properties || []) {
    console.log(`\n🏠 物件: ${property.property_number} (${property.id})`);
    console.log(`   storage_location: ${property.storage_location || 'なし'}`);
    console.log(`   image_url: ${property.image_url || 'なし'}`);
    
    if (!property.storage_location) {
      console.log(`   ⚠️ storage_location が設定されていません`);
      noStorageCount++;
      
      if (property.image_url) {
        console.log(`   ℹ️ image_url にフォールバック可能`);
      }
      continue;
    }
    
    try {
      const images = await imageService.getFirstImage(property.id, property.storage_location);
      
      if (images.length > 0) {
        console.log(`   ✅ 画像取得成功: ${images[0]}`);
        successCount++;
      } else {
        console.log(`   ⚠️ 画像が見つかりません（フォルダが空の可能性）`);
        emptyFolderCount++;
        
        if (property.image_url) {
          console.log(`   ℹ️ image_url にフォールバック可能: ${property.image_url}`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ エラー: ${error.message}`);
      errorCount++;
      
      if (property.image_url) {
        console.log(`   ℹ️ image_url にフォールバック可能: ${property.image_url}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 診断結果サマリー:');
  console.log(`   ✅ 成功: ${successCount} 件`);
  console.log(`   ⚠️ storage_location なし: ${noStorageCount} 件`);
  console.log(`   ⚠️ フォルダが空: ${emptyFolderCount} 件`);
  console.log(`   ❌ エラー: ${errorCount} 件`);
  console.log(`   📊 画像表示率: ${((successCount / (properties?.length || 1)) * 100).toFixed(1)}%`);
  console.log('');
}

diagnose().catch(console.error);
