/**
 * 買主スプレッドシートのシート名を確認
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSheetNames() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  
  console.log('スプレッドシートID:', spreadsheetId);
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  
  console.log('\nシート一覧:');
  response.data.sheets?.forEach((sheet, index) => {
    console.log(`  ${index + 1}. ${sheet.properties?.title}`);
  });
}

checkSheetNames().catch(console.error);
