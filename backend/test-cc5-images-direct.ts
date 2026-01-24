import dotenv from 'dotenv';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

async function testCC5Images() {
  console.log('🔍 CC5の画像を直接取得テスト\n');
  
  const storageUrl = 'https://drive.google.com/drive/folders/1VLD4BPEm1QyDWYZtZwngM3-OFVu5YhFk';
  
  console.log(`📂 Storage URL: ${storageUrl}\n`);
  
  try {
    const propertyImageService = new PropertyImageService(
      60, // cacheTTLMinutes
      60, // folderIdCacheTTLMinutes
      2,  // subfolderSearchTimeoutSeconds
      3   // maxSubfoldersToSearch
    );
    
    console.log('🔄 画像を取得中...\n');
    
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
    
    console.log('📊 結果:');
    console.log(`  - 画像数: ${result.images.length}`);
    console.log(`  - フォルダID: ${result.folderId}`);
    console.log(`  - キャッシュ: ${result.cached ? 'あり' : 'なし'}`);
    
    if (result.images.length > 0) {
      console.log('\n📷 画像一覧:');
      result.images.slice(0, 5).forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     ID: ${img.id}`);
        console.log(`     URL: ${img.url.substring(0, 80)}...`);
      });
      
      if (result.images.length > 5) {
        console.log(`  ... 他 ${result.images.length - 5} 件`);
      }
    } else {
      console.log('\n❌ 画像が見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

testCC5Images();
