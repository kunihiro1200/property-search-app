/**
 * 画像表示問題の診断スクリプト
 * AA13231物件の画像取得フローを完全にトレース
 */

import dotenv from 'dotenv';
import { PropertyListingService } from '../services/PropertyListingService';
import { PropertyImageService } from '../services/PropertyImageService';
import { WorkTaskService } from '../services/WorkTaskService';

dotenv.config();

async function diagnoseImageIssue() {
  console.log('=== 画像表示問題の診断 ===\n');

  const propertyNumber = 'AA13231';
  const propertyListingService = new PropertyListingService();
  const propertyImageService = new PropertyImageService();
  const workTaskService = new WorkTaskService();

  try {
    // ステップ1: 物件情報を取得
    console.log('📋 ステップ1: 物件情報を取得');
    const property = await propertyListingService.getPublicPropertyByNumber(propertyNumber);
    
    if (!property) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    console.log('✅ 物件情報取得成功');
    console.log(`   - ID: ${property.id}`);
    console.log(`   - 物件番号: ${property.property_number}`);
    console.log(`   - storage_location: ${property.storage_location || '(null)'}`);
    console.log('');

    // ステップ2: storage_locationの確認
    console.log('📋 ステップ2: storage_locationの確認');
    let storageUrl = property.storage_location;
    
    if (!storageUrl) {
      console.log('⚠️  storage_locationがnull、work_tasksから取得を試みます');
      const workTask = await workTaskService.getByPropertyNumber(property.property_number);
      storageUrl = workTask?.storage_url;
      console.log(`   - work_tasks.storage_url: ${storageUrl || '(null)'}`);
    } else {
      console.log(`✅ storage_location: ${storageUrl}`);
    }
    console.log('');

    if (!storageUrl) {
      console.error('❌ 格納先URLが見つかりません');
      return;
    }

    // ステップ3: フォルダIDの抽出
    console.log('📋 ステップ3: フォルダIDの抽出');
    const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
    console.log(`   - フォルダID: ${folderId || '(抽出失敗)'}`);
    console.log('');

    if (!folderId) {
      console.error('❌ フォルダIDの抽出に失敗');
      return;
    }

    // ステップ4: 画像一覧の取得
    console.log('📋 ステップ4: 画像一覧の取得');
    const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
    
    console.log(`   - 取得した画像数: ${result.images.length}`);
    console.log(`   - フォルダID: ${result.folderId}`);
    console.log(`   - キャッシュ: ${result.cached ? 'あり' : 'なし'}`);
    console.log('');

    if (result.images.length === 0) {
      console.error('❌ 画像が見つかりません');
      return;
    }

    // ステップ5: 画像URLの確認
    console.log('📋 ステップ5: 画像URLの確認');
    console.log('最初の3枚の画像:');
    result.images.slice(0, 3).forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.name}`);
      console.log(`      - ID: ${img.id}`);
      console.log(`      - サムネイルURL: ${img.thumbnailUrl}`);
      console.log(`      - フル画像URL: ${img.fullImageUrl}`);
    });
    console.log('');

    // ステップ6: APIエンドポイントのテスト
    console.log('📋 ステップ6: APIエンドポイントのテスト');
    console.log('以下のURLでテストしてください:');
    console.log(`   - 画像一覧: http://localhost:3000/api/public/properties/${property.id}/images`);
    console.log(`   - 最初の画像: http://localhost:3000${result.images[0].thumbnailUrl}`);
    console.log('');

    console.log('✅ 診断完了');
    console.log('');
    console.log('=== 診断結果サマリー ===');
    console.log(`物件番号: ${propertyNumber}`);
    console.log(`物件ID: ${property.id}`);
    console.log(`格納先URL: ${storageUrl}`);
    console.log(`フォルダID: ${folderId}`);
    console.log(`画像数: ${result.images.length}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

diagnoseImageIssue();
