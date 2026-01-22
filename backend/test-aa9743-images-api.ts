import axios from 'axios';

async function testImagesApi() {
  console.log('=== AA9743 画像API診断 ===\n');
  
  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  const propertyNumber = 'AA9743';
  
  try {
    console.log(`📡 APIリクエスト: ${baseUrl}/api/public/properties/${propertyNumber}/images`);
    const response = await axios.get(`${baseUrl}/api/public/properties/${propertyNumber}/images`);
    
    console.log(`✅ ステータス: ${response.status}`);
    console.log(`📦 レスポンス:`, JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.error(`❌ エラー発生`);
    console.error(`ステータス: ${error.response?.status}`);
    console.error(`エラーメッセージ:`, error.response?.data);
    console.error(`詳細:`, error.message);
  }
}

testImagesApi();
