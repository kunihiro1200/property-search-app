// 業務リストスプレッドシートのシート一覧を取得
import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listSheets() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
  
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  console.log('業務リストスプレッドシートのシート一覧:');
  response.data.sheets?.forEach((sheet: any) => {
    console.log('  -', sheet.properties.title);
  });
}

listSheets();
