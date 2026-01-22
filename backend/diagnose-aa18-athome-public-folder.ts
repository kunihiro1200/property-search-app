/**
 * AA18物件の"athome公開"フォルダ診断スクリプト
 * 
 * 目的:
 * - AA18物件のstorage_location/storage_urlを確認
 * - "athome公開"フォルダの存在を確認
 * - フォルダ内の画像を確認
 * - 現在の実装が正しく動作するか検証
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import { PropertyImageService } from './src/services/PropertyImageService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * フォルダIDをURLから抽出
 */
function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(folderIdRegex);
  if (match && match[1]) {
    return match[1];
  }
  
  // フォルダIDの形式の場合はそのまま返す
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  
  return null;
}

/**
 * 文字列のバイト表現を取得
 */
function getByteRepresentation(str: string): string {
  const bytes = Buffer.from(str, 'utf8');
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

async function main() {
  console.log('🔍 AA18物件の"athome公開"フォルダ診断を開始します...\n');
  console.log('='.repeat(80) + '\n');

  const driveService = new GoogleDriveService();
  const imageService = new PropertyImageService();

  try {
    // 1. AA18物件の情報を取得
    console.log('📋 Step 1: AA18物件の情報を取得中...\n');
    
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'AA18')
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!property) {
      console.log('❌ AA18物件が見つかりませんでした');
      console.log('\n💡 確認事項:');
      console.log('   1. property_listingsテーブルにAA18が存在するか');
      console.log('   2. property_numberが正確に"AA18"であるか（大文字小文字、スペースなど）');
      return;
    }

    console.log('✅ AA18物件を発見しました:');
    console.log(`   物件番号: ${property.property_number}`);
    console.log(`   storage_location: ${property.storage_location || '(未設定)'}`);

    // storage_locationを使用
    const storageUrl = property.storage_location;
    
    if (!storageUrl) {
      console.log('\n❌ storage_locationが設定されていません');
      console.log('\n💡 対応方法:');
      console.log('   1. Google DriveでAA18のフォルダを作成');
      console.log('   2. フォルダのURLをstorage_locationに設定');
      return;
    }

    // 2. フォルダIDを抽出
    console.log('\n\n' + '='.repeat(80));
    console.log('📂 Step 2: フォルダIDを抽出中...\n');

    const parentFolderId = extractFolderIdFromUrl(storageUrl);
    if (!parentFolderId) {
      console.log('❌ フォルダIDの抽出に失敗しました');
      console.log(`   URL: ${storageUrl}`);
      console.log('\n💡 対応方法:');
      console.log('   1. URLが正しい形式か確認');
      console.log('   2. 正しい形式: https://drive.google.com/drive/folders/FOLDER_ID');
      return;
    }

    console.log('✅ フォルダIDを抽出しました:');
    console.log(`   親フォルダID: ${parentFolderId}`);

    // 3. 親フォルダ内のサブフォルダを確認
    console.log('\n\n' + '='.repeat(80));
    console.log('📁 Step 3: 親フォルダ内のサブフォルダを確認中...\n');

    const { files } = await driveService.listFolderContents(parentFolderId);
    const subfolders = files.filter(f => f.isFolder);
    const imageFiles = files.filter(f => !f.isFolder);

    console.log(`✅ フォルダ内容を取得しました:`);
    console.log(`   サブフォルダ数: ${subfolders.length}`);
    console.log(`   画像ファイル数: ${imageFiles.length}`);

    if (subfolders.length > 0) {
      console.log('\n📂 サブフォルダ一覧:');
      subfolders.forEach((folder, index) => {
        console.log(`\n   ${index + 1}. "${folder.name}"`);
        console.log(`      ID: ${folder.id}`);
        console.log(`      バイト表現: ${getByteRepresentation(folder.name)}`);
        
        // "athome公開"との比較
        const isExactMatch = folder.name === 'athome公開';
        const isAtbbMatch = folder.name === 'atbb公開';
        const containsAthome = folder.name.toLowerCase().includes('athome');
        const containsKoukai = folder.name.includes('公開');
        
        console.log(`      "athome公開"と完全一致: ${isExactMatch ? '✅ はい' : '❌ いいえ'}`);
        console.log(`      "atbb公開"と完全一致: ${isAtbbMatch ? '✅ はい' : '❌ いいえ'}`);
        console.log(`      "athome"を含む: ${containsAthome ? 'はい' : 'いいえ'}`);
        console.log(`      "公開"を含む: ${containsKoukai ? 'はい' : 'いいえ'}`);
      });
    }

    // 4. "athome公開"フォルダを検索
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 Step 4: "athome公開"フォルダを検索中...\n');

    const athomeFolderId = await driveService.findFolderByName(parentFolderId, 'athome公開');
    
    if (athomeFolderId) {
      console.log('✅ "athome公開"フォルダを発見しました！');
      console.log(`   フォルダID: ${athomeFolderId}`);

      // "athome公開"フォルダ内の画像を取得
      console.log('\n📸 "athome公開"フォルダ内の画像を取得中...');
      const { files: athomeFiles } = await driveService.listFolderContents(athomeFolderId);
      const athomeImages = athomeFiles.filter(f => !f.isFolder);

      console.log(`   画像数: ${athomeImages.length}`);
      
      if (athomeImages.length > 0) {
        console.log('\n   画像一覧:');
        athomeImages.forEach((img, index) => {
          console.log(`   ${index + 1}. ${img.name}`);
          console.log(`      ID: ${img.id}`);
          console.log(`      サイズ: ${(img.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`      URL: https://drive.google.com/uc?export=view&id=${img.id}`);
        });
      }
    } else {
      console.log('❌ "athome公開"フォルダが見つかりませんでした');
      
      // "atbb公開"フォルダも検索
      console.log('\n🔍 "atbb公開"フォルダを検索中...');
      const atbbFolderId = await driveService.findFolderByName(parentFolderId, 'atbb公開');
      
      if (atbbFolderId) {
        console.log('✅ "atbb公開"フォルダを発見しました！');
        console.log(`   フォルダID: ${atbbFolderId}`);
      } else {
        console.log('❌ "atbb公開"フォルダも見つかりませんでした');
        console.log('\n💡 親フォルダの画像が使用されます');
      }
    }

    // 5. PropertyImageServiceを使用して画像を取得（実際の動作確認）
    console.log('\n\n' + '='.repeat(80));
    console.log('🧪 Step 5: PropertyImageServiceを使用して画像を取得中...\n');

    const result = await imageService.getImagesFromStorageUrl(storageUrl);

    console.log('✅ 画像取得結果:');
    console.log(`   取得した画像数: ${result.images.length}`);
    console.log(`   使用されたフォルダID: ${result.folderId}`);
    console.log(`   キャッシュから取得: ${result.cached ? 'はい' : 'いいえ'}`);

    if (result.images.length > 0) {
      console.log('\n📸 取得した画像:');
      result.images.forEach((img, index) => {
        console.log(`\n   ${index + 1}. ${img.name}`);
        console.log(`      ID: ${img.id}`);
        console.log(`      サイズ: ${(img.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`      サムネイルURL: ${img.thumbnailUrl}`);
      });
    }

    // 6. 診断結果のサマリー
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 診断結果サマリー');
    console.log('='.repeat(80) + '\n');

    const hasAthomeFolder = athomeFolderId !== null;
    const expectedFolderId = athomeFolderId || parentFolderId;
    const isUsingCorrectFolder = result.folderId === expectedFolderId;

    console.log(`✅ AA18物件: 存在する`);
    console.log(`${storageUrl ? '✅' : '❌'} storage_location: ${storageUrl ? '設定済み' : '未設定'}`);
    console.log(`${hasAthomeFolder ? '✅' : '❌'} "athome公開"フォルダ: ${hasAthomeFolder ? '存在する' : '存在しない'}`);
    console.log(`${result.images.length > 0 ? '✅' : '❌'} 画像取得: ${result.images.length}枚`);
    console.log(`${isUsingCorrectFolder ? '✅' : '⚠️'} 正しいフォルダを使用: ${isUsingCorrectFolder ? 'はい' : 'いいえ'}`);

    // 7. 推奨される対応
    console.log('\n\n' + '='.repeat(80));
    console.log('💡 推奨される対応');
    console.log('='.repeat(80) + '\n');

    if (hasAthomeFolder && result.images.length > 0 && isUsingCorrectFolder) {
      console.log('✅ すべて正常に動作しています！');
      console.log('\n次のステップ:');
      console.log('   1. バックエンドを再起動（キャッシュクリア）');
      console.log('   2. 公開物件サイトでAA18を確認');
      console.log('   3. 画像が正しく表示されることを確認');
    } else if (!hasAthomeFolder) {
      console.log('⚠️ "athome公開"フォルダが存在しません');
      console.log('\n対応方法:');
      console.log('   1. Google DriveでAA18のフォルダを開く');
      console.log(`      URL: https://drive.google.com/drive/folders/${parentFolderId}`);
      console.log('   2. "athome公開"という名前のサブフォルダを作成');
      console.log('   3. 公開したい画像を"athome公開"フォルダに移動');
      console.log('   4. このスクリプトを再実行して確認');
    } else if (result.images.length === 0) {
      console.log('⚠️ 画像が取得できませんでした');
      console.log('\n対応方法:');
      console.log('   1. "athome公開"フォルダに画像が存在するか確認');
      console.log('   2. 画像ファイルの形式を確認（JPEG, PNG, GIFなど）');
      console.log('   3. Google Driveのアクセス権限を確認');
    } else if (!isUsingCorrectFolder) {
      console.log('⚠️ 期待されるフォルダと異なるフォルダが使用されています');
      console.log(`   期待: ${expectedFolderId}`);
      console.log(`   実際: ${result.folderId}`);
      console.log('\n対応方法:');
      console.log('   1. キャッシュをクリア');
      console.log('   2. バックエンドを再起動');
      console.log('   3. このスクリプトを再実行');
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

main();
