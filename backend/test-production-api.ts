// 本番環境のAPIエンドポイントをテスト
import fetch from 'node-fetch';

async function testProductionAPI() {
  console.log('🔍 本番環境APIのテスト開始...\n');
  
  const apiUrl = 'https://baikyaku-property-site3.vercel.app';
  
  try {
    // 1. 物件一覧取得（最初の1件のみ）
    console.log('📋 物件一覧取得テスト...');
    const listResponse = await fetch(`${apiUrl}/api/public/properties?limit=1&offset=0`);
    
    if (!listResponse.ok) {
      console.error('❌ 物件一覧取得エラー:', listResponse.status, listResponse.statusText);
      const errorText = await listResponse.text();
      console.error('エラー詳細:', errorText);
      return;
    }
    
    const listData = await listResponse.json();
    console.log('✅ 物件一覧取得成功');
    console.log('総件数:', listData.pagination?.total);
    console.log('取得件数:', listData.properties?.length);
    
    if (listData.properties && listData.properties.length > 0) {
      const firstProperty = listData.properties[0];
      console.log('\n📦 最初の物件データ:');
      console.log('物件番号:', firstProperty.property_number);
      console.log('住所:', firstProperty.address);
      console.log('価格:', firstProperty.price);
      console.log('画像URL:', firstProperty.image_url || '(なし)');
      console.log('storage_location:', firstProperty.storage_location || '(なし)');
      
      // 2. 画像プロキシエンドポイントをテスト
      if (firstProperty.image_url) {
        console.log('\n🖼️ 画像プロキシテスト...');
        console.log('画像URL:', firstProperty.image_url);
        
        // 画像URLが相対パスの場合、絶対パスに変換
        let imageUrl = firstProperty.image_url;
        if (imageUrl.startsWith('/api/')) {
          imageUrl = `${apiUrl}${imageUrl}`;
        }
        
        console.log('完全なURL:', imageUrl);
        
        const imageResponse = await fetch(imageUrl);
        console.log('画像レスポンスステータス:', imageResponse.status);
        console.log('Content-Type:', imageResponse.headers.get('content-type'));
        
        if (imageResponse.ok) {
          console.log('✅ 画像取得成功');
        } else {
          console.error('❌ 画像取得エラー:', imageResponse.status, imageResponse.statusText);
          const errorText = await imageResponse.text();
          console.error('エラー詳細:', errorText.substring(0, 500));
        }
      } else {
        console.log('\n⚠️ 最初の物件に画像URLがありません');
      }
      
      // 3. 物件詳細取得テスト
      console.log('\n📄 物件詳細取得テスト...');
      const detailResponse = await fetch(`${apiUrl}/api/public/properties/${firstProperty.id}`);
      
      if (!detailResponse.ok) {
        console.error('❌ 物件詳細取得エラー:', detailResponse.status, detailResponse.statusText);
      } else {
        const detailData = await detailResponse.json();
        console.log('✅ 物件詳細取得成功');
        console.log('画像数:', detailData.images?.length || 0);
        if (detailData.images && detailData.images.length > 0) {
          console.log('最初の画像URL:', detailData.images[0]);
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testProductionAPI();
