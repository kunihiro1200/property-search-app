import axios from 'axios';

async function testApiResponse() {
  try {
    console.log('🔍 Testing API response for AA13462...');
    
    const response = await axios.get('http://localhost:3000/api/sellers/d63eac99-490e-446e-830e-fc69609460be');
    
    console.log('\n📊 API Response:');
    console.log('  Status:', response.status);
    console.log('  unreachableStatus:', response.data.unreachableStatus);
    console.log('  typeof unreachableStatus:', typeof response.data.unreachableStatus);
    console.log('  isUnreachable:', response.data.isUnreachable);
    console.log('  inquiryDate:', response.data.inquiryDate);
    
    console.log('\n📄 Full response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.unreachableStatus) {
      console.log('\n✅ unreachableStatus is present in API response');
    } else {
      console.log('\n❌ unreachableStatus is NOT present in API response');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApiResponse();
