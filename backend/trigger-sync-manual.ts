import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function triggerSync() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not configured; sync was not started');
  console.log('🔄 Starting authenticated property listing sync...');

  try {
    const response = await fetch('https://property-site-frontend-kappa.vercel.app/api/cron/sync-property-listings', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    
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
