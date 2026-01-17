import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import * as dotenv from 'dotenv';

dotenv.config();

async function diagnoseAA13129Images() {
  console.log('=== AA13129の画像表示問題を診断 ===\n');

  const storageUrl = 'https://drive.google.com/drive/folders/1nbVqT3XejIfpUIUpsG5d2GAL3To3KV7H?usp=sharing';
  const propertyImageService = new PropertyImageService();
  const driveService = new GoogleDriveService();

  try {
    // 1. フォルダIDを抽出
    const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
    console.log('✅ フォルダID:', folderId);
    console.log('');

    if (!folderId) {
      console.error('❌ フォルダIDを抽出できませんでした');
      return;
    }

    // 2. 親フォルダの内容を確認
    console.log('📁 親フォルダの内容を確認:');
    try {
      const parentFiles = await driveService.listFiles(folderId);
      console.log(`  - ファイル/フォルダ数: ${parentFiles.length}`);
      
      // フォルダのみをフィルタリング
      const folders = parentFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      console.log(`  - サブフォルダ数: ${folders.length}`);
      
      if (folders.length > 0) {
        console.log('  - サブフォルダ一覧:');
        folders.forEach(folder => {
          console.log(`    * ${folder.name} (ID: ${folder.id})`);
        });
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ 親フォルダの内容取得エラー:', error.message);
      console.log('');
    }

    // 3. "athome公開"フォルダを検索
    console.log('🔍 "athome公開"フォルダを検索:');
    try {
      const athomeFolderId = await driveService.findFolderByName(folderId, 'athome公開');
      if (athomeFolderId) {
        console.log(`  ✅ 見つかりました: ${athomeFolderId}`);
        
        // athome公開フォルダ内の画像を確認
        const athomeImages = await driveService.listImagesWithThumbnails(athomeFolderId);
        console.log(`  - 画像数: ${athomeImages.length}`);
        if (athomeImages.length > 0) {
          console.log('  - 画像一覧:');
          athomeImages.slice(0, 5).forEach(img => {
            console.log(`    * ${img.name} (ID: ${img.id})`);
          });
          if (athomeImages.length > 5) {
            console.log(`    ... 他 ${athomeImages.length - 5} 枚`);
          }
        }
      } else {
        console.log('  ❌ 見つかりませんでした');
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ "athome公開"フォルダ検索エラー:', error.message);
      console.log('');
    }

    // 4. "atbb公開"フォルダを検索
    console.log('🔍 "atbb公開"フォルダを検索:');
    try {
      const atbbFolderId = await driveService.findFolderByName(folderId, 'atbb公開');
      if (atbbFolderId) {
        console.log(`  ✅ 見つかりました: ${atbbFolderId}`);
        
        // atbb公開フォルダ内の画像を確認
        const atbbImages = await driveService.listImagesWithThumbnails(atbbFolderId);
        console.log(`  - 画像数: ${atbbImages.length}`);
        if (atbbImages.length > 0) {
          console.log('  - 画像一覧:');
          atbbImages.slice(0, 5).forEach(img => {
            console.log(`    * ${img.name} (ID: ${img.id})`);
          });
          if (atbbImages.length > 5) {
            console.log(`    ... 他 ${atbbImages.length - 5} 枚`);
          }
        }
      } else {
        console.log('  ❌ 見つかりませんでした');
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ "atbb公開"フォルダ検索エラー:', error.message);
      console.log('');
    }

    // 5. 親フォルダ内の画像を確認
    console.log('📸 親フォルダ内の画像を確認:');
    try {
      const parentImages = await driveService.listImagesWithThumbnails(folderId);
      console.log(`  - 画像数: ${parentImages.length}`);
      if (parentImages.length > 0) {
        console.log('  - 画像一覧:');
        parentImages.slice(0, 5).forEach(img => {
          console.log(`    * ${img.name} (ID: ${img.id})`);
        });
        if (parentImages.length > 5) {
          console.log(`    ... 他 ${parentImages.length - 5} 枚`);
        }
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ 親フォルダの画像取得エラー:', error.message);
      console.log('');
    }

    // 6. PropertyImageServiceを使って画像を取得（実際のAPIと同じロジック）
    console.log('🎯 PropertyImageServiceで画像を取得:');
    try {
      const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
      console.log(`  - 取得した画像数: ${result.images.length}`);
      console.log(`  - 使用したフォルダID: ${result.folderId}`);
      console.log(`  - キャッシュから取得: ${result.cached}`);
      
      if (result.images.length > 0) {
        console.log('  - 画像一覧:');
        result.images.slice(0, 5).forEach(img => {
          console.log(`    * ${img.name}`);
          console.log(`      - サムネイルURL: ${img.thumbnailUrl}`);
          console.log(`      - フル画像URL: ${img.fullImageUrl}`);
        });
        if (result.images.length > 5) {
          console.log(`    ... 他 ${result.images.length - 5} 枚`);
        }
      } else {
        console.log('  ⚠️ 画像が見つかりませんでした');
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ PropertyImageServiceエラー:', error.message);
      console.error('詳細:', error);
      console.log('');
    }

    // 7. 診断結果のまとめ
    console.log('📋 診断結果のまとめ:');
    console.log('  - フォルダIDは正しく抽出できています');
    console.log('  - 上記の結果から、画像が表示されない原因を特定してください');
    console.log('');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }

  console.log('=== 診断完了 ===');
}

diagnoseAA13129Images();
