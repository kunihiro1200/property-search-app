import dotenv from 'dotenv';

dotenv.config();

async function testApiImagesResponse() {
  console.log('🔍 本番APIの画像レスポンスをテスト中...\n');

  const apiUrl = process.env.VITE_API_URL || 'https://baikyaku-property-site3.vercel.app';
  
  try {
    // 1. 物件一覧を取得
    console.log(`📡 APIリクエスト: ${apiUrl}/api/public/properties?limit=5`);
    const response = await fetch(`${apiUrl}/api/public/properties?limit=5`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`\n✅ レスポンス成功`);
    console.log(`📊 取得した物件数: ${data.properties?.length || 0}件\n`);
    
    // 2. 各物件の画像データを確認
    if (data.properties && data.properties.length > 0) {
      data.properties.forEach((property: any, index: number) => {
        console.log(`\n物件 ${index + 1}: ${property.property_number}`);
        console.log(`  - atbb_status: ${property.atbb_status || '未設定'}`);
        console.log(`  - address: ${property.address || property.display_address || 'なし'}`);
        console.log(`  - price: ${property.price ? `${property.price / 10000}万円` : '未設定'}`);
        
        // 画像データを確認
        if (property.images && Array.isArray(property.images)) {
          console.log(`  - images配列: ${property.images.length}枚`);
          if (property.images.length > 0) {
            console.log(`    サンプル画像URL: ${property.images[0].substring(0, 100)}...`);
          }
        } else if (property.image_url) {
          console.log(`  - image_url (未変換): ${property.image_url.substring(0, 100)}...`);
        } else {
          console.log(`  - 画像データなし ❌`);
        }
      });
    } else {
      console.log('❌ 物件データが取得できませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

testApiImagesResponse();
