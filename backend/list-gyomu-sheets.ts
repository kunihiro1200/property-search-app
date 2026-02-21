import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function listGyomuSheets() {
  console.log('📋 Listing sheets in Property List spreadsheet...\n');
  
  // 認証情報を取得
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
    credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 物件リストスプレッドシートIDを使用
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error('❌ PROPERTY_LISTING_SPREADSHEET_ID not found in environment');
    return;
  }
  
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  
  try {
    // スプレッドシートのメタデータを取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });
    
    const sheetList = response.data.sheets || [];
    console.log(`\n✅ Found ${sheetList.length} sheets:\n`);
    
    sheetList.forEach((sheet, index) => {
      const title = sheet.properties?.title || 'Unknown';
      const sheetId = sheet.properties?.sheetId || 'Unknown';
      console.log(`${index + 1}. "${title}" (ID: ${sheetId})`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listGyomuSheets().catch(console.error);
