import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testPublicPropertiesAPI() {
  try {
    console.log('Testing /api/public/properties endpoint...');
    console.log('URL: http://localhost:3000/api/public/properties?limit=20&offset=0');
    console.log('');
    
    const response = await axios.get('http://localhost:3000/api/public/properties', {
      params: {
        limit: 20,
        offset: 0
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:');
    console.log('- Total properties:', response.data.pagination?.total);
    console.log('- Properties returned:', response.data.properties?.length);
    console.log('');
    
    if (response.data.properties && response.data.properties.length > 0) {
      console.log('First 3 properties:');
      response.data.properties.slice(0, 3).forEach((property: any, index: number) => {
        console.log(`\n${index + 1}. ${property.property_number}:`);
        console.log(`   - has image_url: ${!!property.image_url}`);
        console.log(`   - has storage_location: ${!!property.storage_location}`);
        console.log(`   - images array length: ${property.images?.length || 0}`);
        console.log(`   - images:`, property.images);
      });
    }
    
    console.log('\n✅ API test completed');
    
  } catch (error: any) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPublicPropertiesAPI();
