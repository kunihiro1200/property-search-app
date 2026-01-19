import dotenv from 'dotenv';

dotenv.config();

async function testApiWithImages() {
  console.log('🔍 画像が設定された物件をテスト中...\n');

  const apiUrl = process.env.VITE_API_URL || 'https://baikyaku-property-site3.vercel.app';
  
  // 画像が設定されたはずの物件番号
  const propertyNumbers = ['AA10528', 'AA9365', 'AA10493', 'AA12851', 'AA10225'];
  
  for (const propertyNumber of propertyNumbers) {
    try {
      console.log(`\n📡 APIリクエスト: ${apiUrl}/api/public/properties/${propertyNumber}`);
      const response = await fetch(`${apiUrl}/api/public/properties/${propertyNumber}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP error! status: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const property = data.property;
      
      console.log(`✅ ${property.property_number}`);
      console.log(`  - atbb_status: ${property.atbb_status || '未設定'}`);
      console.log(`  - address: ${property.address || property.display_address || 'なし'}`);
      
      if (property.images && Array.isArray(property.images)) {
        console.log(`  - images配列: ${property.images.length}枚 ✅`);
        if (property.images.length > 0) {
          console.log(`    サンプル画像URL: ${property.images[0].substring(0, 100)}...`);
        }
      } else {
        console.log(`  - 画像データなし ❌`);
      }
      
    } catch (error: any) {
      console.error(`❌ エラー (${propertyNumber}):`, error.message);
    }
  }
}

testApiWithImages();
