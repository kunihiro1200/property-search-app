import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function checkVercelCronEnv() {
  console.log('=== Vercel本番環境のCron Jobをテスト ===\n');

  const VERCEL_URL = 'https://property-site-frontend-kappa.vercel.app';
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) throw new Error('CRON_SECRET is not configured');
  // This endpoint can process real pending inquiries; require explicit intent.
  if (process.env.ALLOW_LIVE_CRON_TEST !== 'YES') {
    throw new Error('This starts a live inquiry sync; set ALLOW_LIVE_CRON_TEST=YES to opt in');
  }

  console.log('URL:', `${VERCEL_URL}/api/cron/sync-inquiries`);
  console.log('Cron authentication: configured (value hidden)');
  console.log('');

  try {
    const response = await axios.get(`${VERCEL_URL}/api/cron/sync-inquiries`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      timeout: 30000 // 30秒タイムアウト
    });

    console.log('✅ レスポンス:');
    console.log('ステータス:', response.status);
    console.log('Cron request completed; inspect results through normal reports');
  } catch (error: any) {
    console.error('❌ エラー:');
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('Cron request failed; response body omitted');
    } else if (error.code === 'ECONNABORTED') {
      console.error('タイムアウト: 30秒以内にレスポンスがありませんでした');
    } else {
      console.error(error.message);
    }
  }
}

checkVercelCronEnv().catch(console.error);
