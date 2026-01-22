import { GoogleDriveService } from './src/services/GoogleDriveService';
import { ReplicateImageCleanupService } from './src/services/ReplicateImageCleanupService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSingleImage() {
  console.log('🎨 1枚だけテスト - 画像クリーンアップ\n');

  // ⚠️ ここを変更: テストしたいGoogle DriveフォルダのID
  const folderId = '1uBUCJ17FQ5fAjfvCrZbwcn4QT3fj2Sn3';
  
  console.log(`📁 対象フォルダ: https://drive.google.com/drive/folders/${folderId}\n`);
  
  const driveService = new GoogleDriveService();
  const cleanupService = new ReplicateImageCleanupService();

  try {
    // 1. フォルダ内の画像を取得
    console.log('📂 フォルダ内の画像を取得中...');
    const files = await driveService.listFiles(folderId);
    
    const imageFiles = files.filter(file => 
      file.mimeType?.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      console.log('⚠️  画像ファイルが見つかりませんでした');
      return;
    }

    console.log(`✅ ${imageFiles.length}枚の画像を発見`);
    console.log('\n📋 画像リスト:');
    imageFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
    });

    // 最初の1枚だけを処理
    const testFile = imageFiles[0];
    console.log(`\n🎯 テスト対象: ${testFile.name}\n`);

    // 2. 画像をダウンロード
    console.log('📥 画像をダウンロード中...');
    const imageData = await driveService.getImageData(testFile.id);
    console.log('✅ ダウンロード完了\n');

    // 3. 画像をクリーンアップ
    console.log('🎨 画像をクリーンアップ中...');
    console.log('   （この処理には1〜2分かかります）');
    const result = await cleanupService.cleanupImage(imageData.buffer);

    if (!result.success || !result.outputUrl) {
      console.error('\n❌ クリーンアップ失敗:', result.error);
      return;
    }

    console.log('✅ クリーンアップ完了\n');

    // 4. 「加工済み」フォルダを作成または取得
    console.log('📁 「加工済み」フォルダを準備中...');
    const outputFolderId = await driveService.createFolder(folderId, '加工済み');
    console.log(`   ✅ 「加工済み」フォルダを作成しました`);
    console.log(`   📁 https://drive.google.com/drive/folders/${outputFolderId}\n`);

    // 5. クリーンアップされた画像をアップロード
    console.log('📤 クリーンアップされた画像をアップロード中...');
    const cleanedBuffer = await cleanupService.downloadImage(result.outputUrl);

    // 元のファイル名をそのまま使用
    const originalName = testFile.name || 'image.jpg';

    await driveService.uploadFile(
      outputFolderId,
      cleanedBuffer,
      originalName,
      'image/jpeg'
    );

    console.log('\n' + '='.repeat(60));
    console.log('✨ テスト完了！');
    console.log('='.repeat(60));
    console.log(`\n📊 結果:`);
    console.log(`   元の画像: ${testFile.name}`);
    console.log(`   処理済み: ${originalName}`);
    console.log(`\n📁 加工済み画像の場所:`);
    console.log(`   https://drive.google.com/drive/folders/${outputFolderId}`);
    console.log(`\n💡 元の画像はそのまま残っています`);
    console.log(`   元のフォルダ: https://drive.google.com/drive/folders/${folderId}`);
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Google Driveで結果を確認してください！');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

testSingleImage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
