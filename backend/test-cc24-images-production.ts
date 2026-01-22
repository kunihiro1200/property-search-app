import axios from 'axios';

async function testCC24ImagesProduction() {
  console.log('=== 本番環境でCC24の画像エンドポイントをテスト ===\n');

  // 正しい本番環境のURL
  const productionUrl = 'https://property-site-frontend-kappa.vercel.app';
  
  try {
    console.log(`リクエスト先: ${productionUrl}/api/public/properties/CC24/images\n`);
    
    const response = await axios.get(`${productionUrl}/api/public/properties/CC24/images`, {
      headers: {
        'Accept': 'application/json',
      },
      validateStatus: () => true, // すべてのステータスコードを受け入れる
    });
    
    
    console.log('ステータスコード:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('\n');
    
    // HTMLが返された場合
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.log('❌ エラー: HTMLが返されました（バックエンドにルーティングされていません）');
      console.log('最初の200文字:', response.data.substring(0, 200));
      return;
    }
    
    console.log('レスポンスデータ（全体）:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');
    console.log('- 画像数:', response.data.images?.length || 0);
    console.log('- フォルダID:', response.data.folderId);
    console.log('- キャッシュ:', response.data.cached);
    console.log('- エラー:', response.data.error);
    console.log('- メッセージ:', response.data.message);
    console.log('\n');
    
    if (response.data.images && response.data.images.length > 0) {
      console.log('=== 画像URL一覧（最初の5件） ===');
      response.data.images.slice(0, 5).forEach((img: any, index: number) => {
        console.log(`${index + 1}. ${img.name}`);
        console.log(`   Thumbnail: ${img.thumbnailUrl}`);
        console.log(`   Full: ${img.fullImageUrl}`);
        console.log('');
      });
      
      console.log(`\n✅ 成功: ${response.data.images.length}件の画像が取得できました`);
    } else {
      console.log('⚠️ 画像が見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンスデータ:', error.response.data);
    }
  }
}

testCC24ImagesProduction().catch(console.error);
