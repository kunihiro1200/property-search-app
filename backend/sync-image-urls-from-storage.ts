import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

async function syncImageUrls() {
  console.log('🖼️  画像URLを同期中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const driveService = new GoogleDriveService();

  try {
    // storage_locationがGoogle DriveのURLで、image_urlが設定されていない物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, image_url')
      .not('storage_location', 'is', null)
      .like('storage_location', '%drive.google.com%') // Google DriveのURLのみ
      .is('image_url', null)
      .limit(50); // 最初の50件

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 画像URL未設定の物件: ${properties?.length || 0}件\n`);

    if (!properties || properties.length === 0) {
      console.log('✅ 全ての物件に画像URLが設定されています');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const property of properties) {
      try {
        console.log(`🔍 ${property.property_number}: 画像取得中...`);

        // storage_locationからフォルダIDを抽出
        const folderIdMatch = property.storage_location.match(/folders\/([a-zA-Z0-9_-]+)/);
        
        if (!folderIdMatch) {
          console.log(`  ⚠️  フォルダIDを抽出できません: ${property.storage_location}`);
          failCount++;
          continue;
        }

        const folderId = folderIdMatch[1];

        // Google Driveから画像ファイルを取得
        const imageFiles = await driveService.listImageFiles(folderId);

        if (imageFiles.length === 0) {
          console.log(`  ⚠️  画像が見つかりません`);
          failCount++;
          continue;
        }

        // 画像URLを生成（Google DriveのビューURL）
        const imageUrls = imageFiles.map(file => 
          `https://drive.google.com/uc?export=view&id=${file.id}`
        );

        // image_urlカラムに保存（JSON形式）
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({ image_url: JSON.stringify(imageUrls) })
          .eq('id', property.id);

        if (updateError) {
          console.log(`  ❌ 更新エラー: ${updateError.message}`);
          failCount++;
          continue;
        }

        console.log(`  ✅ ${imageUrls.length}枚の画像URLを保存`);
        successCount++;

      } catch (error: any) {
        console.log(`  ❌ エラー: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n📊 同期完了:');
    console.log(`  ✅ 成功: ${successCount}件`);
    console.log(`  ❌ 失敗: ${failCount}件`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

syncImageUrls();
