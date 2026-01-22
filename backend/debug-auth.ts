import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as path from 'path';

const result = dotenv.config({ path: path.join(__dirname, '.env') });
if (result.error) {
  console.error('❌ .envファイルの読み込みエラー:', result.error);
} else {
  console.log('✅ .envファイルを読み込みました:', path.join(__dirname, '.env'));
}

async function main() {
  console.log('\n🔍 認証設定のデバッグ\n');
  
  console.log('環境変数:');
  console.log('  GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  console.log('  GOOGLE_OAUTH_CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID);
  console.log('  GOOGLE_OAUTH_CLIENT_SECRET:', process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '設定済み' : '未設定');
  console.log('  GOOGLE_OAUTH_REFRESH_TOKEN:', process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? '設定済み' : '未設定');
  console.log('');

  const config = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  };

  console.log('GoogleSheetsClient設定:');
  console.log('  serviceAccountKeyPath:', config.serviceAccountKeyPath);
  console.log('  clientId:', config.clientId);
  console.log('  clientSecret:', config.clientSecret ? '設定済み' : '未設定');
  console.log('  refreshToken:', config.refreshToken ? '設定済み' : '未設定');
  console.log('');

  try {
    const client = new GoogleSheetsClient(config);
    console.log('✅ クライアント作成成功');
    
    console.log('\n🔐 認証を試行中...');
    await client.authenticate();
    console.log('✅ 認証成功');
    
    console.log('\n📖 スプレッドシートからデータを読み取り中...');
    const data = await client.readAll();
    console.log(`✅ ${data.length}行のデータを読み取りました`);
    
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error('\nスタックトレース:');
    console.error(error.stack);
  }
}

main();
