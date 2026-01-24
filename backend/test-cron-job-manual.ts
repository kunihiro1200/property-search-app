import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCronJobManual() {
  console.log('🧪 Cron Jobエンドポイントを手動でテスト中...\n');

  try {
    // 本番環境のURLを使用
    const url = 'https://property-site-frontend-kappa.vercel.app/api/cron/sync-inquiries';
    
    console.log(`📡 URL: ${url}\n`);
    
    const response = await axios.get(url, {
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
