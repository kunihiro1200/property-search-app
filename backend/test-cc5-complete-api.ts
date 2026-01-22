import axios from 'axios';

async function testCC5CompleteAPI() {
  console.log('=== CC5 Complete API Test ===\n');
  
  // 本番環境のURL（UUIDで）
  const apiUrl = 'https://property-site-frontend-kappa.vercel.app/api/public/properties/4a2b5a4a-5bbe-48c3-8c21-eafa5b6a21e2/complete';
  
  console.log('API URL:', apiUrl);
  
  try {
    const response = await axios.get(apiUrl);
    
    console.log('\n=== Response Status ===');
    console.log('Status:', response.status);
    
    console.log('\n=== Response Data ===');
    console.log('favoriteComment:', response.data.favoriteComment);
    console.log('\nrecommendedComments:', response.data.recommendedComments);
    console.log('\npropertyAbout:', response.data.propertyAbout);
    console.log('\nathomeData:', response.data.athomeData);
    
    console.log('\n=== Summary ===');
    console.log('Has favoriteComment:', !!response.data.favoriteComment);
    console.log('Has recommendedComments:', !!response.data.recommendedComments);
    console.log('Has propertyAbout:', !!response.data.propertyAbout);
    console.log('Has athomeData:', !!response.data.athomeData);
    console.log('Has panoramaUrl in athomeData:', !!response.data.athomeData?.panoramaUrl);
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCC5CompleteAPI();
