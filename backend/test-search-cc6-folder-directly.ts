import dotenv from 'dotenv';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

/**
 * searchFolderByName()を使ってCC6フォルダを直接検索
 */
async function testSearchCC6FolderDirectly() {
  const driveService = new GoogleDriveService();
  const propertyNumber = 'CC6';

  try {
    console.log(`\n🔍 Searching for folder containing "${propertyNumber}" using searchFolderByName()...`);

    // searchFolderByName()を使用（マイドライブと共有ドライブの両方を検索）
    const propertyFolderId = await driveService.searchFolderByName(propertyNumber);

    if (!propertyFolderId) {
      console.error(`\n❌ Property folder not found for ${propertyNumber}`);
      return;
    }

    console.log(`\n✅ Found property folder ID: ${propertyFolderId}`);

    // athome公開フォルダを検索
    console.log(`\n🔍 Searching for "athome公開" folder in property folder...`);
    const athomeFolderId = await driveService.findFolderByName(propertyFolderId, 'athome公開', true);

    if (!athomeFolderId) {
      console.error(`\n❌ athome公開 folder not found in property folder`);
      return;
    }

    console.log(`\n✅ Found athome公開 folder ID: ${athomeFolderId}`);

    // athome公開フォルダのURLを生成
    const athomePublicUrl = `https://drive.google.com/drive/folders/${athomeFolderId}`;
    console.log(`\n📝 athome公開 folder URL: ${athomePublicUrl}`);

    // 画像を取得してテスト
    console.log(`\n📸 Getting images from athome公開 folder...`);
    const images = await driveService.listImagesWithThumbnails(athomeFolderId);
    console.log(`\n✅ Found ${images.length} images`);

    if (images.length > 0) {
      console.log(`\n📋 First 3 images:`);
      images.slice(0, 3).forEach(img => {
        console.log(`  - ${img.name} (${img.id})`);
      });
    }

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
  }
}

testSearchCC6FolderDirectly();
