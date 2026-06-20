import axios from 'axios';

async function checkVercelCronEnv() {
  console.log('=== Vercel本番環境のCron Jobをテスト ===\n');

  const VERCEL_URL = 'https://property-site-frontend-kappa.vercel.app';
  const CRON_SECRET = 'your-secret-key-here-12345';

  console.log('URL:', `${VERCEL_URL}/api/cron/sync-inquiries`);
  console.log('Authorization: Bearer', CRON_SECRET);
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
    console.log('データ:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ エラー:');
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('データ:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED') {
      console.error('タイムアウト: 30秒以内にレスポンスがありませんでした');
    } else {
      console.error(error.message);
    }
  }
}

checkVercelCronEnv().catch(console.error);
