import { GoogleAuthService } from './src/services/GoogleAuthService';

async function check() {
  console.log('=== 会社アカウントのGoogleカレンダー接続確認 ===\n');
  
  const googleAuthService = new GoogleAuthService();
  
  try {
    const isConnected = await googleAuthService.isConnected();
    
    if (isConnected) {
      console.log('✅ 会社アカウントはGoogleカレンダーに接続されています');
      
      // アクセストークンを取得してみる
      try {
        const accessToken = await googleAuthService.getAccessToken();
        console.log('✅ アクセストークンの取得に成功しました');
        console.log('   トークン（最初の20文字）:', accessToken.substring(0, 20) + '...');
      } catch (tokenError: any) {
        console.error('❌ アクセストークンの取得に失敗:', tokenError.message);
      }
    } else {
      console.log('❌ 会社アカウントはGoogleカレンダーに接続されていません');
      console.log('');
      console.log('接続するには:');
      console.log('1. ブラウザで http://localhost:3000/api/auth/google/calendar にアクセス');
      console.log('2. Googleアカウントでログイン（国広智子さんのアカウント）');
      console.log('3. カレンダーへのアクセスを許可');
    }
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

check();
