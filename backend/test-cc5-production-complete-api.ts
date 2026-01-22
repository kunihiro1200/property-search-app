import axios from 'axios';

async function testCC5CompleteAPI() {
  console.log('=== CC5 Complete API Test (Production) ===\n');
  
  const propertyId = '4a2b5a4a-5bbe-48c3-8c21-eafa5b6a21e2'; // CC5のUUID
  const apiUrl = `https://baikyaku-property-site3.vercel.app/api/public/properties/${propertyId}/complete`;
  
  console.log('API URL:', apiUrl);
  
  try {
    const response = await axios.get(apiUrl);
    
    console.log('\n=== Response Status ===');
    console.log('Status:', response.status);
    
    console.log('\n=== Response Data ===');
    console.log('favoriteComment:', response.data.favoriteComment?.substring(0, 100) || 'undefined');
    console.log('\nrecommendedComments:', response.data.recommendedComments?.length || 'undefined');
    console.log('\npropertyAbout:', response.data.propertyAbout || 'undefined');
    console.log('\nathomeData:', response.data.athomeData || 'undefined');
    
    console.log('\n=== Summary ===');
    console.log('Has favoriteComment:', !!response.data.favoriteComment);
    console.log('Has recommendedComments:', !!response.data.recommendedComments);
    console.log('Has propertyAbout:', !!response.data.propertyAbout);
    console.log('Has athomeData:', !!response.data.athomeData);
    console.log('Has panoramaUrl in athomeData:', !!response.data.athomeData?.panoramaUrl);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCC5CompleteAPI();
