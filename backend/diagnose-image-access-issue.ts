/**
 * 画像アクセス問題の診断スクリプト
 * 
 * このスクリプトは以下を確認します：
 * 1. Google Drive APIの認証状態
 * 2. 特定の物件の画像フォルダへのアクセス
 * 3. 画像ファイルの取得可能性
 */

import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';

async function diagnoseImageAccess() {
  console.log('🔍 画像アクセス問題の診断を開始します...\n');

  const propertyId = '593c43f9-8e10-4eea-8209-6484911f3364';
  
  try {
    // 1. 物件情報を取得
    console.log('1️⃣ 物件情報を取得中...');
    const propertyService = new PropertyListingService();
    const property = await propertyService.getPublicPropertyById(propertyId);
    
    if (!property) {
      console.error('❌ 物件が見つかりません');
      return;
    }
    
    console.log('✅ 物件情報取得成功');
    console.log(`   物件番号: ${property.property_number}`);
    console.log(`   格納先URL: ${property.storage_location || '未設定'}\n`);

    // 2. 格納先URLの確認
    if (!property.storage_location) {
      console.error('❌ 格納先URLが設定されていません');
      return;
    }

    // 3. フォルダIDの抽出
    console.log('2️⃣ フォルダIDを抽出中...');
    const imageService = new PropertyImageService();
    const folderId = imageService.extractFolderIdFromUrl(property.storage_location);
    
    if (!folderId) {
      console.error('❌ フォルダIDの抽出に失敗しました');
      return;
    }
    
    console.log(`✅ フォルダID: ${folderId}\n`);

    // 4. Google Drive APIの認証確認
    console.log('3️⃣ Google Drive APIの認証を確認中...');
    const driveService = new GoogleDriveService();
    
    try {
      // フォルダ内のファイル一覧を取得してみる
      const files = await driveService.listImagesWithThumbnails(folderId);
      console.log(`✅ 認証成功 - ${files.length}個の画像が見つかりました\n`);
      
      if (files.length > 0) {
        console.log('4️⃣ 最初の画像ファイルへのアクセスをテスト中...');
        const firstFile = files[0];
        console.log(`   ファイルID: ${firstFile.id}`);
        console.log(`   ファイル名: ${firstFile.name}`);
        
        try {
          const imageData = await driveService.getImageData(firstFile.id);
          console.log(`✅ 画像データ取得成功`);
          console.log(`   サイズ: ${(imageData.size / 1024).toFixed(2)} KB`);
          console.log(`   MIMEタイプ: ${imageData.mimeType}\n`);
          
          console.log('✨ 診断完了: すべてのチェックに合格しました');
          console.log('   問題は一時的なものか、フロントエンドの実装にある可能性があります\n');
        } catch (error: any) {
          console.error('❌ 画像データの取得に失敗しました');
          console.error(`   エラー: ${error.message}`);
          console.error('\n🔧 推奨される対処法:');
          console.error('   1. Google Drive APIの権限を確認してください');
          console.error('   2. サービスアカウントがフォルダへのアクセス権を持っているか確認してください');
          console.error('   3. APIキーの有効期限を確認してください\n');
        }
      } else {
        console.warn('⚠️  フォルダ内に画像が見つかりませんでした');
        console.warn('   フォルダが空か、画像ファイルが存在しない可能性があります\n');
      }
    } catch (error: any) {
      console.error('❌ Google Drive APIの認証に失敗しました');
      console.error(`   エラー: ${error.message}`);
      console.error('\n🔧 推奨される対処法:');
      console.error('   1. backend/.env ファイルのGOOGLE_SERVICE_ACCOUNT_EMAIL を確認');
      console.error('   2. backend/google-service-account.json ファイルが存在するか確認');
      console.error('   3. サービスアカウントがGoogle Drive APIを有効にしているか確認\n');
    }

  } catch (error: any) {
    console.error('❌ 診断中にエラーが発生しました');
    console.error(`   エラー: ${error.message}\n`);
  }
}

// スクリプトを実行
diagnoseImageAccess().catch(console.error);
