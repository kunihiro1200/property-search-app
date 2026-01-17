const { google } = require('googleapis');
require('dotenv').config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
const CODE = process.argv[2]; // コマンドライン引数から取得

if (!CODE) {
  console.error('❌ エラー: 認証コードを引数として指定してください');
  console.log('使用方法: node get-refresh-token.js <認証コード>');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getRefreshToken() {
  try {
    const { tokens } = await oauth2Client.getToken(CODE);
    console.log('\n✅ リフレッシュトークン取得成功！\n');
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\n');
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

getRefreshToken();
