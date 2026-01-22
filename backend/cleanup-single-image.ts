import { GoogleDriveService } from './src/services/GoogleDriveService';
import { ReplicateImageCleanupService } from './src/services/ReplicateImageCleanupService';
import * as dotenv from 'dotenv';

dotenv.config();

interface SingleImageArgs {
  fileId: string;
  prompt?: string;
  outputFolder?: string;
}

function parseArgs(): SingleImageArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      parsed[key] = value;
    }
  }

  if (!parsed.fileId) {
    console.error('❌ Error: --fileId is required');
    console.log('\n使い方:');
    console.log('  npm run cleanup-single -- --fileId=FILE_ID');
    console.log('  npm run cleanup-single -- --fileId=FILE_ID --prompt="sofa, table"');
    console.log('  npm run cleanup-single -- --fileId=FILE_ID --outputFolder=OUTPUT_ID');
    process.exit(1);
  }

  return parsed as SingleImageArgs;
}

async function main() {
  console.log('🎨 個別画像クリーンアップツール\n');

  const args = parseArgs();
  console.log('📋 設定:');
  console.log(`   ファイルID: ${args.fileId}`);
  console.log(`   除去プロンプト: ${args.prompt || 'furniture, clutter, personal items, decorations'}`);
  console.log(`   出力フォルダID: ${args.outputFolder || '(元のフォルダと同じ)'}\n`);

  const driveService = new GoogleDriveService();
  const cleanupService = new ReplicateImageCleanupService();

  try {
    // 1. 画像のメタデータを取得
    console.log('📂 画像情報を取得中...');
    const metadata = await driveService.getFileMetadata(args.fileId);
    
    if (!metadata) {
      console.error('❌ 画像が見つかりませんでした');
      return;
    }

    console.log(`✅ 画像: ${metadata.name}\n`);

    // 2. 画像をダウンロード
    console.log('📥 画像をダウンロード中...');
    const imageData = await driveService.getImageData(args.fileId);
    console.log('✅ ダウンロード完了\n');

    // 3. 画像をクリーンアップ
    console.log('🎨 画像をクリーンアップ中...');
    const result = await cleanupService.cleanupImage(
      imageData.buffer,
      { prompt: args.prompt }
    );

    if (!result.success || !result.outputUrl) {
      console.error('❌ クリーンアップ失敗:', result.error);
      return;
    }

    console.log('✅ クリーンアップ完了\n');

    // 4. クリーンアップされた画像をアップロード
    console.log('📤 クリーンアップされた画像をアップロード中...');
    const cleanedBuffer = await cleanupService.downloadImage(result.outputUrl);

    // 新しいファイル名を生成
    const nameParts = metadata.name.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    const newName = `${baseName}_cleaned.${extension}`;

    // 出力先フォルダを決定（指定がなければ元の画像と同じフォルダ）
    let outputFolderId = args.outputFolder;
    if (!outputFolderId) {
      // 元の画像の親フォルダを取得
      // 注: この実装では簡略化のため、ユーザーに出力フォルダを指定してもらう
      console.error('❌ --outputFolder を指定してください');
      return;
    }

    await driveService.uploadFile(
      outputFolderId,
      cleanedBuffer,
      newName,
      'image/jpeg'
    );

    console.log('\n✨ 処理が完了しました！');
    console.log(`   📁 出力先: https://drive.google.com/drive/folders/${outputFolderId}`);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
