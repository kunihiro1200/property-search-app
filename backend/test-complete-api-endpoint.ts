// /api/public/properties/:propertyNumber/complete エンドポイントをテスト
import axios from 'axios';

async function testCompleteAPI() {
  console.log('🔍 Testing /complete API endpoint...\n');
  
  const testProperties = [
    { number: 'CC20', id: '0c92ed19-a401-4a1c-a84d-9b7176fdd1e7' },
    { number: 'CC16', id: 'd29b0e5a-8f43-48ef-ae0b-7272864e5050' },
    { number: 'AA13341', id: 'a47edc7a-0562-4cb9-a1f4-9e844a90ae5d' },
    { number: 'CC14', id: '12dbb7c7-b7be-44d7-9e7c-2fc48f11d991' }
  ];
  
  for (const property of testProperties) {
    try {
      console.log(`\n📝 Testing ${property.number}...`);
      
      // property_numberでテスト
      const url = `http://localhost:3000/api/public/properties/${property.number}/complete`;
      console.log(`   URL: ${url}`);
      
      const response = await axios.get(url);
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
      
      if (response.data.favoriteComment) {
        console.log(`   ✅ favoriteComment: "${response.data.favoriteComment.substring(0, 60)}..."`);
      } else {
        console.log(`   ❌ favoriteComment: NULL or missing`);
      }
      
      if (response.data.propertyAbout) {
        console.log(`   ✅ propertyAbout: EXISTS`);
      } else {
        console.log(`   ❌ propertyAbout: NULL or missing`);
      }
      
      if (response.data.recommendedComments && response.data.recommendedComments.length > 0) {
        console.log(`   ✅ recommendedComments: ${response.data.recommendedComments.length} items`);
      } else {
        console.log(`   ❌ recommendedComments: NULL or empty`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  console.log('\n✅ Test complete!');
}

testCompleteAPI();
