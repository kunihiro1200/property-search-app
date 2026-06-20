import axios from 'axios';

async function checkVersion() {
  console.log('🔍 Checking Vercel deployment version...\n');

  try {
    const healthUrl = 'https://property-site-frontend-kappa.vercel.app/api/health';
    
    console.log('📡 Fetching from:', healthUrl);
    
    const response = await axios.get(healthUrl);
    
    console.log('📊 Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.version) {
      console.log('\n✅ Deployment version:', response.data.version);
      
      if (response.data.version.includes('price-fix-with-destructuring')) {
        console.log('✅ Latest version is deployed!');
        console.log('✅ Price fix with destructuring should be active');
      } else {
        console.log('⚠️ Old version is still deployed');
        console.log('⚠️ Wait for Vercel deployment to complete');
      }
    } else {
      console.log('\n⚠️ No version info found (old deployment)');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✨ Check completed!');
}

checkVersion().catch(console.error);
