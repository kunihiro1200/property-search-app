import axios from 'axios';

async function checkVercelCronStatus() {
  console.log('🔍 Vercel Cron Job設定を確認中...\n');

  try {
    // 本番環境のCron Jobエンドポイントを直接呼び出し
    const url = 'https://property-site-frontend-kappa.vercel.app/api/cron/sync-inquiries';
    
    console.log(`📡 URL: ${url}\n`);
    console.log('⚠️ 注意: 外部からのアクセスは認証が必要な場合があります\n');
    
    const response = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true, // 全てのステータスコードを受け入れる
    });

    console.log('ステータスコード:', response.status);
    console.log('レスポンス:', response.data);
    
    if (response.status === 200) {
      console.log('\n✅ Cron Jobエンドポイントは正常に動作しています');
    } else if (response.status === 401) {
      console.log('\n⚠️ 認証エラー（401）が発生しました');
      console.log('これは外部からのアクセスのため正常です');
      console.log('Vercel Cron Jobsは内部的に実行されるため、この認証は不要です');
    } else {
      console.log('\n❌ 予期しないステータスコード:', response.status);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', error.response.data);
    }
  }
}

checkVercelCronStatus();
