// ローカルAPIのテスト
const fetch = require('node-fetch');

async function testLocalAPI() {
  try {
    console.log('🔍 Testing local API...\n');
    
    // 本番APIをテスト
    const apiUrl = 'https://baikyaku-property-site3.vercel.app';
    console.log(`Testing: ${apiUrl}/api/public/properties\n`);
    
    const response = await fetch(`${apiUrl}/api/public/properties?limit=5`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.properties && data.properties.length > 0) {
      const firstProperty = data.properties[0];
      console.log('\n📊 First property:');
      console.log('  property_number:', firstProperty.property_number);
      console.log('  address:', firstProperty.address);
      console.log('  images:', firstProperty.images ? `${firstProperty.images.length}枚` : 'なし');
      console.log('  image_url:', firstProperty.image_url ? '✅ あり' : '❌ なし');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLocalAPI();
