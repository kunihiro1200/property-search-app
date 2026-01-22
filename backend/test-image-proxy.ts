import axios from 'axios';

async function testImageProxy() {
  try {
    // APIから物件を取得して画像URLを確認
    console.log('🔍 Fetching property with images...');
    const propertiesResponse = await axios.get('https://baikyaku-property-site3.vercel.app/api/public/properties?limit=1');
    
    if (propertiesResponse.data.properties && propertiesResponse.data.properties.length > 0) {
      const property = propertiesResponse.data.properties[0];
      console.log(`✅ Property: ${property.property_number}`);
      console.log(`📸 Images: ${JSON.stringify(property.images)}`);
      
      if (property.images && property.images.length > 0) {
        const imageUrl = property.images[0];
        console.log(`\n🖼️ Testing image URL: ${imageUrl}`);
        
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
          });
          
          console.log(`✅ Image fetch successful!`);
          console.log(`   Status: ${imageResponse.status}`);
          console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
          console.log(`   Content-Length: ${imageResponse.headers['content-length']}`);
        } catch (imageError: any) {
          console.error(`❌ Image fetch failed!`);
          console.error(`   Status: ${imageError.response?.status}`);
          console.error(`   Error: ${imageError.message}`);
          if (imageError.response?.data) {
            const errorText = Buffer.from(imageError.response.data).toString('utf-8');
            console.error(`   Response: ${errorText.substring(0, 500)}`);
          }
        }
      } else {
        console.log('⚠️ No images found in property');
      }
    } else {
      console.log('⚠️ No properties returned');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testImageProxy();
