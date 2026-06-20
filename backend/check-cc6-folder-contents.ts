import dotenv from 'dotenv';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

async function checkCC6FolderContents() {
  console.log('=== CC6フォルダ内容確認 ===\n');

  const storageUrl = 'https://drive.google.com/drive/folders/1r3L1toOTgFPXBCutMuT8r1rdaVocwPAX?usp=sharing';
  console.log('格納先URL:', storageUrl);
  console.log('');

  const propertyImageService = new PropertyImageService(
    60, // cacheTTLMinutes
    60, // folderIdCacheTTLMinutes
    2,  // searchTimeoutSeconds
    3   // maxSubfoldersToSearch
  );

  try {
    console.log('📂 フォルダ内の画像を取得中...\n');
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);

    console.log('結果:');
    console.log('  - 画像数:', result.images.length);
    console.log('  - フォルダID:', result.folderId);
    console.log('  - キャッシュ:', result.cached ? 'あり' : 'なし');
    console.log('');

    if (result.images.length > 0) {
      console.log('✅ 画像が見つかりました:');
      result.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     - ID: ${img.id}`);
        console.log(`     - サイズ: ${(img.size / 1024 / 1024).toFixed(2)} MB`);
      });
    } else {
      console.log('❌ 画像が見つかりませんでした');
      console.log('');
      console.log('📝 考えられる原因:');
      console.log('1. フォルダが空');
      console.log('2. サブフォルダに画像がある（検索範囲外）');
      console.log('3. Google Driveの権限がない');
      console.log('4. フォルダIDが間違っている');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

checkCC6FolderContents().catch(console.error);
