/**
 * AA13129の"athome公開"フォルダ画像取得スクリプト
 * 
 * このスクリプトは、AA13129の"athome公開"フォルダ内の
 * 画像を取得して表示します。
 * 
 * 実行方法:
 * cd backend
 * npx ts-node test-aa13129-athome-public-folder.ts
 */

import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA13129AthomeFolder() {
  console.log('🧪 AA13129 "athome公開"フォルダ画像取得テスト\n');
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
        console.log(`   ${idx + 1}. ${img.name} (ID: ${img.id})`);
      });
    }
    
    // ステップ4: 親フォルダ内のすべてのフォルダを表示
    console.log('\n📋 ステップ4: 親フォルダ内のすべてのフォルダを確認中...');
    const allFiles = await googleDriveService.listFiles(parentFolderId);
    const folders = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    
    console.log(`✅ 親フォルダに ${folders.length} 個のフォルダがあります`);
    if (folders.length > 0) {
      folders.forEach((folder, idx) => {
        console.log(`   ${idx + 1}. "${folder.name}" (ID: ${folder.id})`);
      });
    } else {
      console.log('   (フォルダなし)');
    }
    
    // ステップ5: "athome公開"フォルダを検索
    console.log('\n📋 ステップ5: "athome公開"フォルダを検索中...');
    const athomeFolderId = await googleDriveService.findFolderByName(parentFolderId, 'athome公開');
    
    if (!athomeFolderId) {
      console.log('❌ "athome公開"フォルダが見つかりませんでした');
      console.log('   → フォルダ名が異なる可能性があります');
      
      // 類似するフォルダ名を探す
      console.log('\n🔍 "athome"を含むフォルダを検索中...');
      const athomeLikeFolders = folders.filter(f => 
        f.name.toLowerCase().includes('athome') || 
        f.name.includes('公開')
      );
      
      if (athomeLikeFolders.length > 0) {
        console.log('   類似するフォルダが見つかりました:');
        athomeLikeFolders.forEach((folder, idx) => {
          console.log(`   ${idx + 1}. "${folder.name}" (ID: ${folder.id})`);
        });
      } else {
        console.log('   類似するフォルダも見つかりませんでした');
      }
      
      return;
    }
    
    console.log('✅ "athome公開"フォルダが見つかりました:', athomeFolderId);
    
    // ステップ6: "athome公開"フォルダの画像を取得
    console.log('\n📋 ステップ6: "athome公開"フォルダの画像を取得中...');
    const athomeImages = await googleDriveService.listImageFiles(athomeFolderId);
    
    console.log(`✅ "athome公開"フォルダに ${athomeImages.length} 枚の画像があります`);
    
    if (athomeImages.length > 0) {
      console.log('\n📸 画像詳細:');
      console.log('='.repeat(70));
      
      for (let i = 0; i < athomeImages.length; i++) {
        const img = athomeImages[i];
        console.log(`\n画像 ${i + 1}:`);
        console.log(`  ファイル名: ${img.name}`);
        console.log(`  ID: ${img.id}`);
        console.log(`  MIMEタイプ: ${img.mimeType}`);
        console.log(`  WebViewLink: ${img.webViewLink || '(なし)'}`);
        console.log(`  WebContentLink: ${img.webContentLink || '(なし)'}`);
        console.log(`  ThumbnailLink: ${img.thumbnailLink || '(なし)'}`);
        
        // 画像のサイズ情報があれば表示
        if (img.size) {
          const sizeInMB = (Number(img.size) / (1024 * 1024)).toFixed(2);
          console.log(`  サイズ: ${sizeInMB} MB`);
        }
      }
      
      console.log('\n' + '='.repeat(70));
    } else {
      console.log('   (画像なし)');
    }
    
    // ステップ7: 画像URLの生成テスト
    console.log('\n📋 ステップ7: 画像URLの生成テスト...');
    
    if (athomeImages.length > 0) {
      const firstImage = athomeImages[0];
      console.log(`\n最初の画像 "${firstImage.name}" のURL生成:`);
      
      // 公開URLを生成
      const publicUrl = `https://drive.google.com/uc?export=view&id=${firstImage.id}`;
      console.log(`  公開URL: ${publicUrl}`);
      
      // サムネイルURL
      if (firstImage.thumbnailLink) {
        console.log(`  サムネイル: ${firstImage.thumbnailLink}`);
      }
    }
    
    // ステップ8: 結果のサマリー
    console.log('\n' + '='.repeat(70));
    console.log('📊 結果のサマリー\n');
    
    console.log(`親フォルダID: ${parentFolderId}`);
    console.log(`親フォルダの画像数: ${parentImages.length} 枚`);
    console.log(`親フォルダのサブフォルダ数: ${folders.length} 個`);
    
    if (athomeFolderId) {
      console.log(`\n"athome公開"フォルダID: ${athomeFolderId}`);
      console.log(`"athome公開"フォルダの画像数: ${athomeImages.length} 枚`);
      
      if (athomeImages.length > 0) {
        console.log('\n✅ "athome公開"フォルダ内の画像を正常に取得できました');
      } else {
        console.log('\n⚠️ "athome公開"フォルダは存在しますが、画像がありません');
      }
    } else {
      console.log('\n❌ "athome公開"フォルダが見つかりませんでした');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ テスト完了');
    
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

// テスト実行
testAA13129AthomeFolder()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
