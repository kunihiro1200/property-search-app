import axios from 'axios';

async function testPublicAPI() {
  console.log('🔍 Testing public properties API...\n');
  
  try {
    // 全件取得（最初の1000件）
    console.log('📊 Fetching all properties (limit=1000, offset=0)...');
    const response = await axios.get('http://localhost:3000/api/public/properties', {
      params: {
        limit: 1000,
        offset: 0,
      },
    });
    
    const properties = response.data.properties || [];
    const pagination = response.data.pagination;
    
    console.log(`✅ Total properties in response: ${properties.length}`);
    console.log(`📊 Pagination info:`, pagination);
    console.log('');
    
    // AA10424を検索
    const aa10424 = properties.find((p: any) => p.property_number === 'AA10424');
    
    if (aa10424) {
      console.log('✅ AA10424 FOUND in all properties!');
      console.log('📊 AA10424 Data:');
      console.log(`  Property Number: ${aa10424.property_number}`);
      console.log(`  Address: ${aa10424.address}`);
      console.log(`  Property Type: ${aa10424.property_type}`);
      console.log(`  Status: ${aa10424.atbb_status}`);
      console.log(`  Google Map URL: ${aa10424.google_map_url || 'NULL'}`);
      console.log('');
      console.log('🎉 AA10424 is included in the API response!');
      console.log('📍 Frontend should be able to geocode and display it on the map.');
    } else {
      console.log('❌ AA10424 NOT FOUND in all properties');
      console.log('');
      console.log('🔍 Let\'s try searching by property number...');
      
      const searchResponse = await axios.get('http://localhost:3000/api/public/properties', {
        params: {
          propertyNumber: 'AA10424',
        },
      });
      
      const searchProperties = searchResponse.data.properties || [];
      
      if (searchProperties.length > 0) {
        console.log('✅ AA10424 found by property number search!');
        console.log('📊 Data:', searchProperties[0]);
      } else {
        console.log('❌ AA10424 not found even by property number search');
      }
    }
    
    // 最初の5件を表示
    console.log('\n📋 First 5 properties:');
    properties.slice(0, 5).forEach((p: any, index: number) => {
      console.log(`  ${index + 1}. ${p.property_number} - ${p.address}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPublicAPI().catch(console.error);
