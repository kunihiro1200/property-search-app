import axios from 'axios';

async function testAA9338CompleteApi() {
  const PRODUCTION_URL = 'https://property-site-frontend-kappa.vercel.app';
  const propertyNumber = 'AA9338';
  
  console.log(`\n🔍 Testing /complete API for ${propertyNumber} in production...`);
  console.log(`URL: ${PRODUCTION_URL}/api/public/properties/${propertyNumber}/complete`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(`${PRODUCTION_URL}/api/public/properties/${propertyNumber}/complete`, {
      timeout: 35000, // 35秒タイムアウト
    });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ API Response received in ${duration}s`);
    console.log('\n📊 Response data:');
    console.log('- property:', response.data.property ? '✅ Exists' : '❌ Missing');
    console.log('- favoriteComment:', response.data.favoriteComment || '(empty)');
    console.log('- recommendedComments:', response.data.recommendedComments ? `✅ ${response.data.recommendedComments.length} items` : '❌ Missing');
    console.log('- propertyAbout:', response.data.propertyAbout || '(empty)');
    console.log('- panoramaUrl:', response.data.panoramaUrl || '(empty)');
    console.log('- athomeData:', response.data.athomeData ? '✅ Exists' : '❌ Missing');
    
    if (response.data.recommendedComments) {
      console.log('\n📝 Recommended Comments:');
      response.data.recommendedComments.forEach((comment: any, index: number) => {
        console.log(`  ${index + 1}. ${comment}`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ API Error:');
    if (error.code === 'ECONNABORTED') {
      console.error('- Timeout: API took longer than 35 seconds');
    } else if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Message:', error.response.data?.message || error.response.data);
    } else {
      console.error('- Error:', error.message);
    }
  }
}

testAA9338CompleteApi();
