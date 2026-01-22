/**
 * AA13129の"atbb公開"フォルダ機能テストスクリプト
 * 
 * このスクリプトは、AA13129で"atbb公開"フォルダ機能が
 * 正しく動作しているかを確認します。
 * 
 * 実行方法:
 * cd backend
 * npx ts-node test-aa13129-atbb-public-folder.ts
 */

import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA13129() {
  console.log('🧪 AA13129 "atbb公開"フォルダ機能テスト\n');
  console.log('='.repeat(70));
  
  const propertyNumber = 'AA13129';
  
  try {
    // ステップ1: AA13129のstorage_urlを取得
    console.log('\n📋 ステップ1: AA13129のデータを取得中...');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();
    
    if (propertyError || !property) {
      console.error('❌ AA13129が見つかりません:', propertyError?.message);
      return;
    }
    
    console.log('✅ AA13129を取得しました');
    console.log('   - ID:', property.id);
    console.log('   - 物件番号:', property.property_number);
    console.log('   - 格納先URL:', property.storage_location || '(未設定)');
    
    if (!property.storage_location) {
      console.error('❌ storage_locationが設定されていません');
      return;
    }
    
    // ステップ2: 親フォルダIDを抽出
    console.log('\n📋 ステップ2: 親フォルダIDを抽出中...');
    const propertyImageService = new PropertyImageService();
    const parentFolderId = propertyImageService.extractFolderIdFromUrl(property.storage_location);
    
    if (!parentFolderId) {
      console.error('❌ フォルダIDを抽出できませんでした');
      return;
    }
    
    console.log('✅ 親フォルダIDを抽出しました:', parentFolderId);
    
    // ステップ3: 親フォルダの画像を取得
    console.log('\n📋 ステップ3: 親フォルダの画像を取得中...');
    const googleDriveService = new GoogleDriveService();
    const parentImages = await googleDriveService.listImageFiles(parentFolderId);
    
    console.log(`✅ 親フォルダに ${parentImages.length} 枚の画像があります`);
    if (parentImages.length > 0) {
      console.log('   画像一覧:');
      parentImages.forEach((img, idx) => {
        console.log(`   ${idx + 1}. ${img.name}`);
      });
    }
    
    // ステップ4: "atbb公開"フォルダを検索
    console.log('\n📋 ステップ4: "atbb公開"フォルダを検索中...');
    const publicFolderId = await googleDriveService.findFolderByName(parentFolderId, 'atbb公開');
    
    if (!publicFolderId) {
      console.log('❌ "atbb公開"フォルダが見つかりませんでした');
      console.log('   → これが問題の原因です！');
      console.log('\n🔍 考えられる原因:');
      console.log('   1. フォルダ名が"atbb公開"ではない（全角/半角、スペースなど）');
      console.log('   2. フォルダが別の場所にある');
      console.log('   3. findFolderByName()の検索ロジックに問題がある');
      
      // 親フォルダ内のすべてのフォルダを表示
      console.log('\n📁 親フォルダ内のすべてのフォルダ:');
      const allFiles = await googleDriveService.listFiles(parentFolderId);
      const folders = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      if (folders.length > 0) {
        folders.forEach((folder, idx) => {
          console.log(`   ${idx + 1}. "${folder.name}" (ID: ${folder.id})`);
        });
      } else {
        console.log('   (フォルダなし)');
      }
      
      return;
    }
    
    console.log('✅ "atbb公開"フォルダが見つかりました:', publicFolderId);
    
    // ステップ5: "atbb公開"フォルダの画像を取得
    console.log('\n📋 ステップ5: "atbb公開"フォルダの画像を取得中...');
    const publicImages = await googleDriveService.listImageFiles(publicFolderId);
    
    console.log(`✅ "atbb公開"フォルダに ${publicImages.length} 枚の画像があります`);
    if (publicImages.length > 0) {
      console.log('   画像一覧:');
      publicImages.forEach((img, idx) => {
        console.log(`   ${idx + 1}. ${img.name}`);
      });
    }
    
    // ステップ6: PropertyImageServiceを使用して画像を取得
    console.log('\n📋 ステップ6: PropertyImageServiceで画像を取得中...');
    const result = await propertyImageService.getImagesFromStorageUrl(property.storage_location);
    
    console.log(`✅ PropertyImageServiceが ${result.images.length} 枚の画像を返しました`);
    console.log('   使用されたフォルダID:', result.folderId);
    console.log('   キャッシュから取得:', result.cached);
    
    if (result.images.length > 0) {
      console.log('   画像一覧:');
      result.images.forEach((img, idx) => {
        console.log(`   ${idx + 1}. ${img.name}`);
      });
    }
    
    // ステップ7: 結果の分析
    console.log('\n' + '='.repeat(70));
    console.log('📊 結果の分析\n');
    
    console.log(`親フォルダの画像数: ${parentImages.length}`);
    console.log(`"atbb公開"フォルダの画像数: ${publicImages.length}`);
    console.log(`PropertyImageServiceが返した画像数: ${result.images.length}`);
    console.log(`使用されたフォルダID: ${result.folderId}`);
    
    // 判定
    console.log('\n🔍 判定:');
    
    if (result.folderId === publicFolderId) {
      console.log('✅ "atbb公開"フォルダが正しく使用されています');
      
      if (result.images.length === publicImages.length) {
        console.log('✅ 画像数も一致しています');
        console.log('\n🎉 機能は正しく動作しています！');
      } else {
        console.log('⚠️ 画像数が一致しません');
        console.log(`   期待: ${publicImages.length}枚`);
        console.log(`   実際: ${result.images.length}枚`);
        console.log('\n❌ キャッシュまたは取得ロジックに問題がある可能性があります');
      }
    } else if (result.folderId === parentFolderId) {
      console.log('❌ 親フォルダが使用されています（"atbb公開"フォルダが無視されている）');
      console.log('\n🔍 これが問題の原因です！');
      console.log('   → getPublicFolderIdIfExists()が正しく動作していない可能性があります');
    } else {
      console.log('⚠️ 予期しないフォルダIDが使用されています');
      console.log(`   期待: ${publicFolderId} (atbb公開) または ${parentFolderId} (親)`);
      console.log(`   実際: ${result.folderId}`);
    }
    
    // ステップ8: キャッシュの確認
    console.log('\n📋 ステップ8: キャッシュをクリアして再テスト...');
    propertyImageService.clearCache();
    
    const resultAfterCacheClear = await propertyImageService.getImagesFromStorageUrl(property.storage_location);
    
    console.log(`✅ キャッシュクリア後: ${resultAfterCacheClear.images.length} 枚の画像`);
    console.log('   使用されたフォルダID:', resultAfterCacheClear.folderId);
    
    if (resultAfterCacheClear.folderId !== result.folderId) {
      console.log('⚠️ キャッシュクリア前後でフォルダIDが変わりました');
      console.log('   → キャッシュに問題がある可能性があります');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ テスト完了');
    
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

// テスト実行
testAA13129()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
