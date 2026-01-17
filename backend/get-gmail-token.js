const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// 環境変数から認証情報を読み込む
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ エラー: GMAIL_CLIENT_IDとGMAIL_CLIENT_SECRETを.envファイルに設定してください');
  process.exit(1);
}

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
