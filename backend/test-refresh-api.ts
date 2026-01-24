import axios from 'axios';

async function testRefreshAPI() {
  const baseURL = 'http://localhost:3000';
  const propertyId = 'CC6';
  
  console.log('='.repeat(60));
  console.log('Testing Refresh API Endpoints');
  console.log('='.repeat(60));
  
  try {
    // Test 1: /refresh-essential
    console.log('\n[Test 1] Testing /refresh-essential...');
    console.log(`URL: ${baseURL}/api/public/properties/${propertyId}/refresh-essential`);
    
    const startEssential = Date.now();
    const essentialResponse = await axios.post(
      `${baseURL}/api/public/properties/${propertyId}/refresh-essential`
    );
    const durationEssential = Date.now() - startEssential;
    
    console.log('✅ Essential response received');
    console.log(`⏱️  Duration: ${durationEssential}ms`);
    console.log('Response data:', JSON.stringify(essentialResponse.data, null, 2));
    
    if (essentialResponse.data.success) {
      console.log('✅ Success: true');
      console.log(`📊 Property: ${essentialResponse.data.data.property.property_number}`);
      console.log(`🖼️  Images: ${essentialResponse.data.data.images.length} images`);
    } else {
      console.log('❌ Success: false');
    }
    
    // Test 2: /refresh-all
    console.log('\n[Test 2] Testing /refresh-all...');
    console.log(`URL: ${baseURL}/api/public/properties/${propertyId}/refresh-all`);
    
    const startAll = Date.now();
    const allResponse = await axios.post(
      `${baseURL}/api/public/properties/${propertyId}/refresh-all`
    );
    const durationAll = Date.now() - startAll;
    
    console.log('✅ All response received');
    console.log(`⏱️  Duration: ${durationAll}ms`);
    console.log('Response data:', JSON.stringify(allResponse.data, null, 2));
    
    if (allResponse.data.success) {
      console.log('✅ Success: true');
      console.log(`📊 Property: ${allResponse.data.data.property.property_number}`);
      console.log(`🖼️  Images: ${allResponse.data.data.images.length} images`);
      console.log(`💬 Recommended Comments: ${allResponse.data.data.recommendedComments?.length || 0} comments`);
      console.log(`⭐ Favorite Comment: ${allResponse.data.data.favoriteComment ? 'Yes' : 'No'}`);
      console.log(`🏠 Property About: ${allResponse.data.data.propertyAbout ? 'Yes' : 'No'}`);
      console.log(`📷 Panorama URL: ${allResponse.data.data.panoramaUrl ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Success: false');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ /refresh-essential: ${durationEssential}ms`);
    console.log(`✅ /refresh-all: ${durationAll}ms`);
    
    if (durationEssential <= 2000) {
      console.log('✅ Essential endpoint is fast enough (≤2s)');
    } else {
      console.log('⚠️  Essential endpoint is slower than expected (>2s)');
    }
    
    if (durationAll <= 5000) {
      console.log('✅ All endpoint is fast enough (≤5s)');
    } else {
      console.log('⚠️  All endpoint is slower than expected (>5s)');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testRefreshAPI();
