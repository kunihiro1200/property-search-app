/**
 * 画像削除のテストスクリプト
 * 実際のエラーを確認するため
 */

import { GoogleDriveService } from './src/services/GoogleDriveService';
import dotenv from 'dotenv';

dotenv.config();

async function testImageDeletion() {
  console.log('=== 画像削除テスト ===\n');

  // テスト対象のフォルダID（URLから抽出）
  const testFolderId = '1nbVqT3XejIfpUIUpsG5d2GAL3To3KV7H';

  const driveService = new GoogleDriveService();

  try {
    // 1. まずフォルダ内のファイル一覧を取得
    console.log('1. フォルダ内のファイル一覧を取得...');
    const files = await driveService.listImagesWithThumbnails(testFolderId);
    console.log(`   ファイル数: ${files.length}`);
    files.forEach(f => {
      console.log(`   - ${f.name} (${f.id})`);
    });

    if (files.length === 0) {
      console.log('   フォルダにファイルがありません');
      return;
    }

    // 2. 最初のファイルのメタデータを取得
    const firstFile = files[0];
    console.log(`\n2. ファイルメタデータを取得: ${firstFile.id}`);
    const metadata = await driveService.getFileMetadata(firstFile.id);
    console.log('   メタデータ:', JSON.stringify(metadata, null, 2));

    // 3. 削除テスト（図面2.jpgを削除してみる）
    const testDeleteFileId = '1VHb4-SKGlKdQsvNeWLrGG-o75ixcbXe4'; // 図面2.jpg
    console.log(`\n3. 削除テスト: ${testDeleteFileId}`);
    try {
      await driveService.deleteFile(testDeleteFileId);
      console.log('   削除成功！');
    } catch (deleteError: any) {
      console.error('   削除エラー:', deleteError.message);
      if (deleteError.response?.data) {
        console.error('   APIエラー詳細:', JSON.stringify(deleteError.response.data, null, 2));
      }
    }

  } catch (error: any) {
    console.error('\n❌ エラー発生:');
    console.error('   メッセージ:', error.message);
    if (error.response?.data) {
      console.error('   APIエラー詳細:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('   エラーコード:', error.code);
    }
    if (error.errors) {
      console.error('   エラー配列:', JSON.stringify(error.errors, null, 2));
    }
  }
}

testImageDeletion();
