import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '../../.env') });

function generateAuthUrl() {
  console.log('================================================================================');
  console.log('Google Sheets OAuth 2.0 認証URL生成');
  console.log('================================================================================\n');

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ エラー: 必要な環境変数が設定されていません');
    console.error('   - GOOGLE_OAUTH_CLIENT_ID');
    console.error('   - GOOGLE_OAUTH_CLIENT_SECRET');
    process.exit(1);
  }

  // OAuth2クライアントを作成
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/api/google/callback'
  );

  // 認証URLを生成
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
    prompt: 'consent',
  });

  console.log('📋 以下の認証URLをコピーしてください:\n');
  console.log('----------------------------------------');
  console.log(authUrl);
  console.log('----------------------------------------\n');
  console.log('⚠️  重要な手順:');
  console.log('1. 上記のURLを全てコピーしてください（Ctrl+C）');
  console.log('2. メモ帳などに貼り付けてください');
  console.log('3. メモ帳からURLをコピーして、ブラウザのアドレスバーに貼り付けてください');
  console.log('4. Googleアカウントでログインし、アクセスを許可してください');
  console.log('5. リダイレクト後のURLから "code" パラメータの値をコピーしてください');
  console.log('   例: http://localhost:3000/api/google/callback?code=XXXXX');
  console.log('   → XXXXX の部分をコピー');
  console.log('6. コピーした認証コードを使って、次のコマンドを実行してください:');
  console.log('   npm run sheets:get-oauth-token\n');
}

generateAuthUrl();
