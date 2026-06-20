import { google } from 'googleapis';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: './backend/.env' });

async function checkHeaders() {
  console.log('🔍 Checking property list spreadsheet headers...\n');

  // Google Sheets APIクライアントを初期化
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;

  // ヘッダー行（1行目）を取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '物件!1:1',
  });

  const headers = response.data.values?.[0] || [];

  console.log('📋 Headers:');
  headers.forEach((header, index) => {
    const columnLetter = String.fromCharCode(65 + index); // A, B, C, ...
    console.log(`  ${columnLetter}列: ${header || '（空）'}`);
  });

  console.log(`\n📊 Total columns: ${headers.length}`);

  // storage_locationカラムを検索
  const storageLocationIndex = headers.findIndex(h => 
    h && (h.includes('格納先') || h.includes('storage') || h.includes('Storage'))
  );

  if (storageLocationIndex !== -1) {
    const columnLetter = String.fromCharCode(65 + storageLocationIndex);
    console.log(`\n✅ Found storage_location column: ${columnLetter}列 (${headers[storageLocationIndex]})`);
  } else {
    console.log('\n❌ storage_location column not found');
  }
}

checkHeaders().catch(console.error);
