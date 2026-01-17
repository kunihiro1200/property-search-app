const { google } = require('googleapis');
const readline = require('readline');

// 環境変数から認証情報を読み込む
const CLIENT_ID = '111282429644-7j3br7ehkp57mmfforgit7djsnfaog5k.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// OAuth2クライアントを作成
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// スコープを設定
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// 認証URLを生成
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('📧 Gmail API リフレッシュトークン取得ツール\n');
console.log('1. 以下のURLをブラウザで開いてください:');
console.log('\n' + authUrl + '\n');
console.log('2. Googleアカウントでログインして権限を許可してください');
console.log('3. リダイレクトされたURLから「code=」の後の文字列をコピーしてください\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('認証コードを入力してください: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ トークン取得成功！\n');
    console.log('以下を .env ファイルの GMAIL_REFRESH_TOKEN に設定してください:\n');
    console.log(tokens.refresh_token);
    console.log('\n');
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
  rl.close();
});
