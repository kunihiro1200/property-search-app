import axios from 'axios';

/**
 * AA9743の現在の問題を診断
 * 1. パノラマURLがnullかどうか
 * 2. 画像URLが正しく生成されているか
 * 3. 画像データが取得できているか
 */

async function diagnoseAA9743() {
  console.log('🔍 AA9743の現在の問題を診断中...\n');

  try {
    // 1. Complete APIをチェック
    console.log('📊 Step 1: Complete APIレスポンスを確認');
    const completeUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/complete';
    console.log(`URL: ${completeUrl}\n`);
    
    const completeResponse = await axios.get(completeUrl);
    const data = completeResponse.data;
    
    console.log('✅ Complete APIレスポンス:');
    console.log('- Property Number:', data.property?.property_number);
    console.log('- Panorama URL:', data.panoramaUrl || '❌ NULL');
    console.log('- Has athome_data:', !!data.athomeData);
    console.log('- Has favorite_comment:', !!data.favoriteComment);
    console.log('- Has recommended_comments:', !!data.recommendedComments);
    console.log('');

    // 2. Images APIをチェック
    console.log('📊 Step 2: Images APIレスポンスを確認');
    const imagesUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/images';
    console.log(`URL: ${imagesUrl}\n`);
    
    const imagesResponse = await axios.get(imagesUrl);
    const imagesData = imagesResponse.data;
    
    console.log('✅ Images APIレスポンス:');
    console.log('- Total images:', imagesData.images?.length || 0);
    console.log('- Cached:', imagesData.cached);
    console.log('- Folder ID:', imagesData.folderId);
    
    if (imagesData.images && imagesData.images.length > 0) {
      const firstImage = imagesData.images[0];
      console.log('\n📸 最初の画像情報:');
      console.log('- ID:', firstImage.id);
      console.log('- Name:', firstImage.name);
      console.log('- Thumbnail URL:', firstImage.thumbnailUrl);
      console.log('- Full Image URL:', firstImage.fullImageUrl);
      console.log('- MIME Type:', firstImage.mimeType);
      console.log('- Size:', firstImage.size, 'bytes');
      
      // 3. 実際に画像データを取得してみる
      console.log('\n📊 Step 3: 実際の画像データを確認');
      try {
        const imageResponse = await axios.get(firstImage.fullImageUrl, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
        });
        
        console.log('✅ 画像データ取得成功:');
        console.log('- Status:', imageResponse.status);
        console.log('- Content-Type:', imageResponse.headers['content-type']);
        console.log('- Content-Length:', imageResponse.headers['content-length'], 'bytes');
        console.log('- Actual Size:', imageResponse.data.length, 'bytes');
        
        // サイズ比較
        const expectedSize = firstImage.size;
        const actualSize = imageResponse.data.length;
        const sizeDiff = Math.abs(expectedSize - actualSize);
        const sizeRatio = (actualSize / expectedSize * 100).toFixed(2);
        
        console.log('\n📊 サイズ比較:');
        console.log('- Expected Size:', expectedSize, 'bytes');
        console.log('- Actual Size:', actualSize, 'bytes');
        console.log('- Difference:', sizeDiff, 'bytes');
        console.log('- Ratio:', sizeRatio, '%');
        
        if (actualSize < expectedSize * 0.5) {
          console.log('⚠️ 警告: 画像サイズが期待値の50%未満です（圧縮されている可能性）');
        } else if (actualSize < expectedSize * 0.8) {
          console.log('⚠️ 警告: 画像サイズが期待値の80%未満です');
        } else {
          console.log('✅ 画像サイズは正常です');
        }
        
      } catch (imageError: any) {
        console.error('❌ 画像データ取得エラー:', imageError.message);
        if (imageError.response) {
          console.error('- Status:', imageError.response.status);
          console.error('- Status Text:', imageError.response.statusText);
        }
      }
    } else {
      console.log('❌ 画像が見つかりません');
    }

    // 4. パノラマURL問題の診断
    console.log('\n📊 Step 4: パノラマURL問題の診断');
    if (!data.panoramaUrl) {
      console.log('❌ パノラマURLがnullです');
      console.log('\n考えられる原因:');
      console.log('1. 業務リストにスプシURLが登録されていない');
      console.log('2. スプレッドシートのathomeシートにN1セルが空');
      console.log('3. シート名の末尾空白が原因（修正済みのはず）');
      console.log('4. スプレッドシートへのアクセス権限がない');
      
      // 業務リストを直接確認する必要がある
      console.log('\n次のステップ:');
      console.log('- 業務リストでAA9743のスプシURLを確認');
      console.log('- スプレッドシートのathomeシートのN1セルを確認');
    } else {
      console.log('✅ パノラマURLが取得できています:', data.panoramaUrl);
    }

    // 5. 画像品質問題の診断
    console.log('\n📊 Step 5: 画像品質問題の診断');
    console.log('\n考えられる原因:');
    console.log('1. フロントエンドがthumbnailUrlを使用している（fullImageUrlを使うべき）');
    console.log('2. Google DriveのAPIがサムネイルを返している');
    console.log('3. ブラウザのキャッシュが古い画像を表示している');
    console.log('4. 画像プロキシが圧縮している');
    
    console.log('\n次のステップ:');
    console.log('- フロントエンドのコードでfullImageUrlを使用しているか確認');
    console.log('- ブラウザの開発者ツールでNetworkタブを確認');
    console.log('- キャッシュをクリアして再読み込み');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
      console.error('- Data:', error.response.data);
    }
  }
}

diagnoseAA9743();
