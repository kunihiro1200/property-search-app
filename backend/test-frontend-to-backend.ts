import fetch from 'node-fetch';

async function testFrontendToBackend() {
  console.log('=== フロントエンド→バックエンド接続テスト ===\n');

  const frontendUrl = 'https://property-site-frontend-kappa.vercel.app';
  const backendUrl = 'https://baikyaku-property-site3.vercel.app';
  const propertyUuid = 'd081edb5-363e-452a-805d-d7a59f621fbb';
  
  // 1. フロントエンドのページが表示されるか
  console.log('1️⃣ フロントエンドページの確認...');
  try {
    const frontendResponse = await fetch(`${frontendUrl}/properties/${propertyUuid}`);
    console.log(`  ステータス: ${frontendResponse.status}`);
    console.log(`  Content-Type: ${frontendResponse.headers.get('content-type')}`);
    
    if (frontendResponse.ok) {
      const html = await frontendResponse.text();
      console.log(`  ✅ HTMLサイズ: ${html.length} bytes`);
      console.log(`  タイトル含む: ${html.includes('<title>') ? 'はい' : 'いいえ'}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  // 2. バックエンドのComplete APIが動作するか
  console.log('\n2️⃣ Complete APIの確認...');
  try {
    const completeResponse = await fetch(`${backendUrl}/api/public/properties/${propertyUuid}/complete`);
    console.log(`  ステータス: ${completeResponse.status}`);
    
    if (completeResponse.ok) {
      const data = await completeResponse.json();
      console.log(`  ✅ property_number: ${data.property?.property_number || 'なし'}`);
      console.log(`  ✅ storage_location: ${data.property?.storage_location || 'なし'}`);
      console.log(`  ✅ favoriteComment: ${data.favoriteComment ? 'あり' : 'なし'}`);
      console.log(`  ✅ recommendedComments: ${data.recommendedComments ? `${data.recommendedComments.length}行` : 'なし'}`);
      console.log(`  ✅ athomeData: ${data.athomeData ? `${data.athomeData.length}件` : 'なし'}`);
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  // 3. バックエンドの画像APIが動作するか
  console.log('\n3️⃣ 画像APIの確認...');
  try {
    const imagesResponse = await fetch(`${backendUrl}/api/public/properties/${propertyUuid}/images`);
    console.log(`  ステータス: ${imagesResponse.status}`);
    
    if (imagesResponse.ok) {
      const data = await imagesResponse.json();
      console.log(`  ✅ 画像数: ${data.images?.length || 0}`);
      if (data.images && data.images.length > 0) {
        console.log(`  最初の画像: ${data.images[0].name}`);
        console.log(`  画像URL: ${data.images[0].url}`);
      }
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  // 4. 画像プロキシが動作するか（最初の画像をテスト）
  console.log('\n4️⃣ 画像プロキシの確認...');
  try {
    const imagesResponse = await fetch(`${backendUrl}/api/public/properties/${propertyUuid}/images`);
    if (imagesResponse.ok) {
      const data = await imagesResponse.json();
      if (data.images && data.images.length > 0) {
        const firstImageId = data.images[0].id;
        const imageProxyUrl = `${backendUrl}/api/public/images/${firstImageId}`;
        
        console.log(`  テスト画像ID: ${firstImageId}`);
        console.log(`  プロキシURL: ${imageProxyUrl}`);
        
        const imageResponse = await fetch(imageProxyUrl);
        console.log(`  ステータス: ${imageResponse.status}`);
        console.log(`  Content-Type: ${imageResponse.headers.get('content-type')}`);
        console.log(`  Content-Length: ${imageResponse.headers.get('content-length')} bytes`);
        
        if (imageResponse.ok) {
          console.log(`  ✅ 画像プロキシ動作中`);
        }
      }
    }
  } catch (error: any) {
    console.error(`  ❌ エラー:`, error.message);
  }
  
  console.log('\n=== テスト完了 ===');
  console.log(`\nフロントエンドURL: ${frontendUrl}/properties/${propertyUuid}`);
}

testFrontendToBackend();
