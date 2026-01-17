/**
 * AA13129 "athome公開"フォルダ検証スクリプト
 * 
 * このスクリプトは以下を確認します:
 * 1. "athome公開"フォルダが正しく検出される
 * 2. "athome公開"フォルダから1枚の画像のみが返される
 * 3. ログに正しいフォルダIDが表示される
 */

import { PropertyImageService } from './src/services/PropertyImageService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA13129AthomePublicFolder() {
  console.log('='.repeat(80));
  console.log('AA13129 "athome公開"フォルダ検証テスト');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. AA13129のstorage_urlを取得
    console.log('📋 Step 1: AA13129のstorage_urlを取得中...');
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'AA13129')
      .single();

    if (error || !property) {
      console.error('❌ AA13129が見つかりません:', error);
      return;
    }

    console.log(`✅ AA13129を取得しました`);
    console.log(`   物件番号: ${property.property_number}`);
    console.log(`   格納先URL: ${property.storage_location}`);
    console.log();

    // 2. PropertyImageServiceを使用して画像を取得
    console.log('📋 Step 2: PropertyImageServiceで画像を取得中...');
    const imageService = new PropertyImageService();
    const result = await imageService.getImagesFromStorageUrl(property.storage_location);

    console.log(`✅ 画像取得完了`);
    console.log(`   画像数: ${result.images.length}枚`);
    console.log(`   使用されたフォルダID: ${result.folderId}`);
    console.log(`   キャッシュから取得: ${result.cached ? 'はい' : 'いいえ'}`);
    console.log();

    // 3. 画像の詳細を表示
    if (result.images.length > 0) {
      console.log('📋 Step 3: 画像の詳細');
      result.images.forEach((image, index) => {
        console.log(`   画像 ${index + 1}:`);
        console.log(`     ファイル名: ${image.name}`);
        console.log(`     ファイルID: ${image.id}`);
        console.log(`     サイズ: ${(image.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`     MIMEタイプ: ${image.mimeType}`);
        console.log();
      });
    }

    // 4. 検証結果
    console.log('='.repeat(80));
    console.log('検証結果');
    console.log('='.repeat(80));
    
    const expectedImageCount = 1;
    const actualImageCount = result.images.length;
    
    if (actualImageCount === expectedImageCount) {
      console.log(`✅ 成功: ${expectedImageCount}枚の画像が返されました（期待通り）`);
    } else {
      console.log(`❌ 失敗: ${actualImageCount}枚の画像が返されました（期待: ${expectedImageCount}枚）`);
    }

    // フォルダIDの確認
    const parentFolderId = imageService.extractFolderIdFromUrl(property.storage_location);
    console.log();
    console.log('フォルダ情報:');
    console.log(`   親フォルダID: ${parentFolderId}`);
    console.log(`   使用されたフォルダID: ${result.folderId}`);
    
    if (result.folderId !== parentFolderId) {
      console.log(`✅ 公開フォルダが使用されました（"athome公開"または"atbb公開"）`);
    } else {
      console.log(`⚠️  親フォルダが使用されました（公開フォルダが見つからなかった可能性）`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('テスト完了');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// スクリプトを実行
testAA13129AthomePublicFolder()
  .then(() => {
    console.log('\n✅ スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトがエラーで終了しました:', error);
    process.exit(1);
  });
