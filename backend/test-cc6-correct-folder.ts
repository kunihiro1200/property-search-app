import { PropertyImageService } from './src/services/PropertyImageService';

async function testCorrectFolder() {
  console.log('=== CC6の正しいathome公開フォルダから画像取得テスト ===\n');

  const correctAthomeUrl = 'https://drive.google.com/drive/folders/16p4voX2h3oqxWRnsaczu_ax85s_Je_NK';
  
  console.log('athome公開フォルダURL:', correctAthomeUrl);
  console.log('\n画像を取得中...\n');

  const propertyImageService = new PropertyImageService(
    60, // cacheTTLMinutes
    60, // folderIdCacheTTLMinutes
    2,  // subfolderSearchTimeoutSeconds
    3   // maxSubfoldersToSearch
  );

  try {
    const result = await propertyImageService.getImagesFromStorageUrl(correctAthomeUrl);
    
    console.log(`✅ 画像取得成功: ${result.images.length}枚\n`);
    
    if (result.images.length === 26) {
      console.log('✅ 画像数が一致しています（26枚）\n');
    } else {
      console.log(`⚠️ 画像数が一致しません（期待: 26枚、実際: ${result.images.length}枚）\n`);
    }
    
    if (result.images.length > 0) {
      console.log('最初の5枚の画像:');
      result.images.slice(0, 5).forEach((img, index) => {
        console.log(`${index + 1}. ${img.name}`);
        console.log(`   ID: ${img.id}`);
      });
    } else {
      console.log('⚠️ 画像が見つかりませんでした');
    }
    
    console.log('\nフォルダ情報:');
    console.log('- フォルダID:', result.folderId);
    console.log('- キャッシュから取得:', result.fromCache ? 'はい' : 'いいえ');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

testCorrectFolder().catch(console.error);
