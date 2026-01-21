import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCC5CompleteApi() {
  try {
    console.log('=== CC5 Complete API Test (Production) ===\n');
    
    const baseUrl = 'https://baikyaku-property-site3.vercel.app';
    
    // まず物件情報を取得してUUIDを取得
    console.log('1. Fetching CC5 property info...');
    const propertyResponse = await axios.get(`${baseUrl}/api/public/properties/CC5`);
    const property = propertyResponse.data.property;
    
    console.log('Property UUID:', property.id);
    console.log('Property Number:', property.property_number);
    console.log('Property Type:', property.property_type);
    console.log('');
    
    // Complete APIをテスト（タイムアウトを60秒に設定）
    console.log('2. Fetching complete data (with 60s timeout)...');
    const startTime = Date.now();
    
    try {
      const completeResponse = await axios.get(
        `${baseUrl}/api/public/properties/${property.id}/complete`,
        { timeout: 60000 } // 60秒タイムアウト
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Complete API responded in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
      console.log('');
      
      const data = completeResponse.data;
      
      console.log('=== Response Data ===');
      console.log('Has favoriteComment:', !!data.favoriteComment);
      console.log('Has recommendedComments:', !!data.recommendedComments);
      console.log('Has athomeData:', !!data.athomeData);
      console.log('Has propertyAbout:', !!data.propertyAbout);
      console.log('Has settlementDate:', !!data.settlementDate);
      console.log('');
      
      if (data.favoriteComment) {
        console.log('Favorite Comment:', data.favoriteComment);
      }
      
      if (data.recommendedComments) {
        console.log('Recommended Comments rows:', data.recommendedComments.length);
        console.log('First row:', data.recommendedComments[0]);
      }
      
      if (data.athomeData) {
        console.log('Athome Data:', data.athomeData);
      }
      
      if (data.propertyAbout) {
        console.log('Property About:', data.propertyAbout.substring(0, 100) + '...');
      }
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Complete API failed after ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
      
      if (error.code === 'ECONNABORTED') {
        console.error('Error: Request timeout (60s exceeded)');
      } else if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCC5CompleteApi();
