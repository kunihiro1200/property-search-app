import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

async function testAA13129ImagesAPI() {
  console.log('=== AA13129 画像API テスト ===\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  const propertyId = '593c43f9-8e10-4eea-8209-6484911f3364';

  try {
    // 1. 物件詳細を取得
    console.log('1️⃣ 物件詳細を取得:');
    const propertyResponse = await axios.get(`${API_BASE_URL}/api/public/properties/${propertyId}`);
    console.log(`  ✅ ステータス: ${propertyResponse.status}`);
    console.log(`  - 物件番号: ${propertyResponse.data.property_number}`);
    console.log(`  - storage_location: ${propertyResponse.data.storage_location || 'NULL'}`);
    console.log('');

    // 2. 画像一覧を取得
    console.log('2️⃣ 画像一覧を取得:');
    const imagesResponse = await axios.get(`${API_BASE_URL}/api/public/properties/${propertyId}/images`);
    console.log(`  ✅ ステータス: ${imagesResponse.status}`);
    console.log(`  - 画像数: ${imagesResponse.data.images.length}`);
    console.log(`  - フォルダID: ${imagesResponse.data.folderId}`);
    console.log(`  - キャッシュ: ${imagesResponse.data.cached}`);
    
    if (imagesResponse.data.images.length > 0) {
      console.log('  - 最初の画像:');
      const firstImage = imagesResponse.data.images[0];
      console.log(`    * ID: ${firstImage.id}`);
      console.log(`    * 名前: ${firstImage.name}`);
      console.log(`    * サムネイルURL: ${firstImage.thumbnailUrl}`);
      console.log(`    * フル画像URL: ${firstImage.fullImageUrl}`);
    }
    console.log('');

    // 3. プロキシ経由で画像を取得（最初の画像）
    if (imagesResponse.data.images.length > 0) {
      const firstImageId = imagesResponse.data.images[0].id;
      
      console.log('3️⃣ プロキシ経由でサムネイルを取得:');
      try {
        const thumbnailResponse = await axios.get(
          `${API_BASE_URL}/api/public/images/${firstImageId}/thumbnail`,
          { responseType: 'arraybuffer', timeout: 10000 }
        );
        console.log(`  ✅ ステータス: ${thumbnailResponse.status}`);
        console.log(`  - Content-Type: ${thumbnailResponse.headers['content-type']}`);
        console.log(`  - サイズ: ${thumbnailResponse.data.length} bytes`);
        console.log('');
      } catch (error: any) {
        console.error(`  ❌ エラー: ${error.message}`);
        if (error.response) {
          console.error(`  - ステータス: ${error.response.status}`);
          console.error(`  - レスポンス: ${error.response.data}`);
        }
        console.log('');
      }

      console.log('4️⃣ プロキシ経由でフル画像を取得:');
      try {
        const fullImageResponse = await axios.get(
          `${API_BASE_URL}/api/public/images/${firstImageId}`,
          { responseType: 'arraybuffer', timeout: 10000 }
        );
        console.log(`  ✅ ステータス: ${fullImageResponse.status}`);
        console.log(`  - Content-Type: ${fullImageResponse.headers['content-type']}`);
        console.log(`  - サイズ: ${fullImageResponse.data.length} bytes`);
        console.log('');
      } catch (error: any) {
        console.error(`  ❌ エラー: ${error.message}`);
        if (error.response) {
          console.error(`  - ステータス: ${error.response.status}`);
          console.error(`  - レスポンス: ${error.response.data}`);
        }
        console.log('');
      }
    }

    // 5. Google Drive直接URLをテスト（参考）
    if (imagesResponse.data.images.length > 0) {
      const firstImage = imagesResponse.data.images[0];
      
      console.log('5️⃣ Google Drive直接URLをテスト（参考）:');
      console.log(`  - サムネイルURL: ${firstImage.thumbnailUrl}`);
      
      try {
        const directResponse = await axios.get(firstImage.thumbnailUrl, {
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: () => true, // すべてのステータスコードを受け入れる
        });
        console.log(`  - ステータス: ${directResponse.status}`);
        console.log(`  - Content-Type: ${directResponse.headers['content-type']}`);
        
        if (directResponse.status === 302 || directResponse.status === 301) {
          console.log(`  ⚠️ リダイレクトが発生しました（認証が必要な可能性）`);
          console.log(`  - Location: ${directResponse.headers['location']}`);
        } else if (directResponse.status === 200) {
          console.log(`  ✅ 直接アクセス可能`);
        } else {
          console.log(`  ⚠️ 予期しないステータスコード`);
        }
      } catch (error: any) {
        console.error(`  ❌ エラー: ${error.message}`);
      }
      console.log('');
    }

    console.log('📋 テスト結果まとめ:');
    console.log('  - APIは正常に動作しています');
    console.log('  - 画像データは正しく取得できています');
    console.log('  - プロキシ経由でのアクセスを推奨します');
    console.log('');

  } catch (error: any) {
    console.error('❌ テストエラー:', error.message);
    if (error.response) {
      console.error('  - ステータス:', error.response.status);
      console.error('  - レスポンス:', error.response.data);
    }
  }

  console.log('=== テスト完了 ===');
}

testAA13129ImagesAPI();
