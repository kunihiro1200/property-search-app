import fetch from 'node-fetch';

async function triggerSync() {
  console.log('🔄 Triggering property listing sync on Vercel...\n');

  try {
    const response = await fetch('https://property-site-frontend-kappa.vercel.app/api/cron/sync-property-listings');
    
    console.log('📊 Response status:', response.status);
    console.log('');
    
    const data = await response.json();
    console.log('📋 Response data:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

triggerSync().catch(console.error);
