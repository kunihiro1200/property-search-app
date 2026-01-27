import { PropertyImageService } from './src/services/PropertyImageService';

async function testCC6Images() {
  console.log('=== CC6の画像取得テスト ===\n');

  const storageUrl = 'https://drive.google.com/drive/folders/1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX';
  
  console.log('格納先URL:', storageUrl);
  console.log('\n画像を取得中...\n');

  const propertyImageService = new PropertyImageService(
    60, // cacheTTLMinutes
    60, // folderIdCacheTTLMinutes
    2,  // subfolderSearchTimeoutSeconds
    3   // maxSubfoldersToSearch
  );

  try {
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
    
    console.log(`✅ 画像取得成功: ${result.images.length}枚\n`);
    
    if (result.images.length > 0) {
      console.log('最初の3枚の画像:');
      result.images.slice(0, 3).forEach((img, index) => {
        console.log(`${index + 1}. ${img.name}`);
        console.log(`   ID: ${img.id}`);
        console.log(`   URL: ${img.fullImageUrl.substring(0, 80)}...`);
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

testCC6Images().catch(console.error);
