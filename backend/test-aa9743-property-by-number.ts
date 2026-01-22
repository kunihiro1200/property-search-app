import axios from 'axios';

async function testPropertyByNumber() {
  console.log('=== AA9743 物件番号で取得テスト ===\n');
  
  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  const propertyNumber = 'AA9743';
  
  try {
    console.log(`📡 APIリクエスト: ${baseUrl}/api/public/properties/${propertyNumber}`);
    const response = await axios.get(`${baseUrl}/api/public/properties/${propertyNumber}`);
    
    console.log(`✅ ステータス: ${response.status}`);
    console.log(`📦 レスポンス:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.property) {
      console.log(`\n物件情報:`);
      console.log(`  - property_number: ${response.data.property.property_number}`);
      console.log(`  - storage_location: ${response.data.property.storage_location}`);
      console.log(`  - athome_data: ${response.data.property.athome_data}`);
    }
    
  } catch (error: any) {
    console.error(`❌ エラー発生`);
    console.error(`ステータス: ${error.response?.status}`);
    console.error(`エラーメッセージ:`, error.response?.data);
    console.error(`詳細:`, error.message);
  }
}

testPropertyByNumber();
