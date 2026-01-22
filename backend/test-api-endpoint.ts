// APIエンドポイントをテスト
import axios from 'axios';

async function testApiEndpoint() {
  console.log('=== APIエンドポイントをテスト ===\n');

  try {
    const response = await axios.get('http://localhost:3000/api/public/properties?limit=5');
    
    console.log(`ステータス: ${response.status}`);
    console.log(`取得件数: ${response.data.properties.length}件\n`);

    response.data.properties.forEach((property: any, index: number) => {
      console.log(`--- 物件 ${index + 1} ---`);
      console.log(`物件番号: ${property.property_number}`);
      console.log(`住所: ${property.address}`);
      console.log(`images配列: ${property.images ? 'あり' : 'なし'}`);
      
      if (property.images) {
        console.log(`画像数: ${property.images.length}枚`);
        if (property.images.length > 0) {
          console.log(`最初の画像URL: ${property.images[0]}`);
        }
      }
      console.log('');
    });

    console.log('✅ APIエンドポイントは正常に動作しています');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testApiEndpoint();
