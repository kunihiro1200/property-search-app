import { google } from 'googleapis';
import * as path from 'path';

async function testGoogleAuth() {
  console.log('🔐 Testing Google Sheets authentication with GoogleAuth...\n');

  try {
    const keyPath = path.resolve(process.cwd(), 'google-service-account.json');
    console.log('📁 Key file path:', keyPath);

    // GoogleAuthを使用（推奨される方法）
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    });

    console.log('🔑 GoogleAuth created, getting client...');
    const client = await auth.getClient();
    console.log('✅ Client obtained successfully');

    // Sheets APIクライアントを作成
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Sheets API client created');

    // テスト: スプレッドシートのメタデータを取得
    const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    console.log('\n📊 Testing access to spreadsheet:', spreadsheetId);

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('✅ Successfully accessed spreadsheet!');
    console.log('📋 Spreadsheet title:', response.data.properties?.title);
    console.log('📄 Number of sheets:', response.data.sheets?.length);

    console.log('\n✅ Authentication test passed!');
  } catch (error: any) {
    console.error('\n❌ Authentication failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nError stack:', error.stack);
  }
}

testGoogleAuth();
