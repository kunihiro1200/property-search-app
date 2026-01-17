import { GoogleDriveService } from './src/services/GoogleDriveService';
import { ReplicateImageCleanupService } from './src/services/ReplicateImageCleanupService';
import * as dotenv from 'dotenv';

dotenv.config();

interface BatchArgs {
  folderId: string;
  prompt?: string;
  outputFolder?: string;
}

function parseArgs(): BatchArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      parsed[key] = value;
    }
  }

  if (!parsed.folderId) {
    console.error('❌ Error: --folderId is required');
    console.log('\n使い方:');
    console.log('  npm run cleanup-images -- --folderId=YOUR_FOLDER_ID');
    console.log('  npm run cleanup-images -- --folderId=YOUR_ID --outputFolder=OUTPUT_ID');
    console.log('  npm run cleanup-images -- --folderId=YOUR_ID --prompt="sofa, table"');
    process.exit(1);
  }

  return parsed as BatchArgs;
}

async function main() {
  console.log('🎨 画像一括クリーンアップツール\n');

  const args = parseArgs();
  console.log('📋 設定:');
  console.log(`   フォルダID: ${args.folderId}`);
  console.log(`   除去プロンプト: ${args.prompt || 'furniture, clutter, personal items, decorations'}`);
  console.log(`   出力先: 「加工済み」フォルダ（自動作成）\n`);

  const driveService = new GoogleDriveService();
  const cleanupService = new ReplicateImageCleanupService();

  try {
    // 1. フォルダ内の画像を取得
    console.log('📂 フォルダ内の画像を取得中...');
    const files = await driveService.listFiles(args.folderId);
    
    // 画像ファイルのみをフィルタ
    const imageFiles = files.filter(file => 
      file.mimeType?.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      console.log('⚠️  画像ファイルが見つかりませんでした');
      return;
    }

    console.log(`✅ ${imageFiles.length}枚の画像を発見\n`);

    // 2. 「加工済み」フォルダを作成または取得
    console.log('📁 「加工済み」フォルダを準備中...');
    let outputFolderId: string;
    
    if (args.outputFolder) {
      outputFolderId = args.outputFolder;
      console.log('   指定されたフォルダを使用');
    } else {
      // 「加工済み」フォルダを作成（親フォルダID, フォルダ名の順）
      outputFolderId = await driveService.createFolder(args.folderId, '加工済み');
      console.log('   ✅ 「加工済み」フォルダを作成しました');
    }
    console.log(`   📁 https://drive.google.com/drive/folders/${outputFolderId}\n`);

    // 3. 各画像をダウンロード
    console.log('📥 画像をダウンロード中...');
    const images: Array<{ id: string; buffer: Buffer; name: string }> = [];
    for (const file of imageFiles) {
      const imageData = await driveService.getImageData(file.id);
      images.push({
        id: file.id,
        buffer: imageData.buffer,
        name: file.name || 'unknown',
      });
    }
    console.log('✅ ダウンロード完了\n');

    // 4. バッチクリーンアップ
    console.log(`🎨 ${imageFiles.length}枚の画像をクリーンアップ中...\n`);
    console.log('⏱️  処理時間の目安:');
    console.log(`   ${imageFiles.length}枚 × 約1〜2分 = 約${imageFiles.length}〜${imageFiles.length * 2}分\n`);
    
    const results = await cleanupService.cleanupBatch(
      images,
      { prompt: args.prompt },
      (current, total, name) => {
        const percent = Math.round((current / total) * 100);
        console.log(`   [${current}/${total}] (${percent}%) ${name}`);
      }
    );

    console.log('\n✅ クリーンアップ完了\n');

    // 5. クリーンアップされた画像をアップロード
    console.log('📤 クリーンアップされた画像をアップロード中...\n');
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < results.length; i++) {
      const { id, result } = results[i];
      const originalFile = imageFiles.find(f => f.id === id);
      
      if (!result.success || !result.outputUrl) {
        console.log(`   ❌ [${i + 1}/${results.length}] ${originalFile?.name} - 失敗: ${result.error}`);
        failCount++;
        continue;
      }

      try {
        // クリーンアップされた画像をダウンロード
        const cleanedBuffer = await cleanupService.downloadImage(result.outputUrl);

        // 元のファイル名をそのまま使用
        const originalName = originalFile?.name || 'image.jpg';

        // アップロード
        await driveService.uploadFile(
          outputFolderId,
          cleanedBuffer,
          originalName,
          'image/jpeg'
        );

        console.log(`   ✅ [${i + 1}/${results.length}] ${originalName}`);
        successCount++;
      } catch (error: any) {
        console.log(`   ❌ [${i + 1}/${results.length}] ${originalFile?.name} - アップロード失敗: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ 処理が完了しました！');
    console.log('='.repeat(60));
    console.log(`\n📊 結果:`);
    console.log(`   ✅ 成功: ${successCount}枚`);
    if (failCount > 0) {
      console.log(`   ❌ 失敗: ${failCount}枚`);
    }
    console.log(`\n📁 加工済み画像の場所:`);
    console.log(`   https://drive.google.com/drive/folders/${outputFolderId}`);
    console.log(`\n💡 元の画像はそのまま残っています`);
    console.log(`   元のフォルダ: https://drive.google.com/drive/folders/${args.folderId}`);
    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
