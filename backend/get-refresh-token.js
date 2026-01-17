const { google } = require('googleapis');

const CLIENT_ID = '111282429644-7j3br7ehkp57mmfforgit7djsnfaog5k.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const CODE = '4/0Ab32j92k4-XjDTEy9YgrmnvGs7RrXADeqeb3ntxjJdwGN725mieeIaGzXLNwZ1E0KzIn5g';

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
