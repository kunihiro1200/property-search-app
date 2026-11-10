import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCronJobManual() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is missing');
  if (process.env.ALLOW_LIVE_CRON_TEST !== 'YES') throw new Error('This test triggers a live sync; set ALLOW_LIVE_CRON_TEST=YES to opt in');
  console.log('🧪 認証付きCron APIを手動実行します...');

  try {
    // 本番環境のURLを使用
    const url = 'https://property-site-frontend-kappa.vercel.app/api/cron/sync-inquiries';
    
    console.log(`📡 URL: ${url}\n`);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${secret}` },
      timeout: 30000, // 30秒タイムアウト
    });

    console.log('✅ Cron Job実行成功');
    console.log('レスポンス:', response.data);
  } catch (error: any) {
    console.error('❌ Cron Job実行失敗');
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', error.response.data);
    } else {
      console.error('エラー:', error.message);
    }
  }
}

testCronJobManual();
