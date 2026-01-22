import dotenv from 'dotenv';
import path from 'path';
import { GoogleDriveService } from './src/services/GoogleDriveService';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkImages() {
  console.log('🔍 Checking images for seller AA13225...');
  
  const driveService = new GoogleDriveService();
  const sellerId = '98f46600-0a96-49bc-a1a7-657d911edaca';
  const sellerNumber = 'AA13225';
  const address = '大分県別府市北浜１丁目7-3';
  const name = '田中 亮子';
  
  try {
    // フォルダを取得または作成
    const folderInfo = await driveService.getOrCreateSellerFolder(
      sellerId,
      sellerNumber,
      address,
      name
    );
    
    console.log('📁 Folder info:');
    console.log('  Folder ID:', folderInfo.folderId);
    
    // 画像一覧を取得
    const images = await driveService.listImagesWithThumbnails(folderInfo.folderId);
    
    console.log(`\n📸 Found ${images.length} images:`);
    images.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.name}`);
      console.log(`     ID: ${img.id}`);
      console.log(`     Size: ${Math.round(img.size / 1024)} KB`);
      console.log(`     Modified: ${new Date(img.modifiedTime).toLocaleString('ja-JP')}`);
    });
    
    if (images.length === 0) {
      console.log('\n⚠️ No images found in the folder');
      console.log('   Please upload some images to test the feature');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkImages().catch(console.error);
