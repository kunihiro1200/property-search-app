// AA5852の正しい情報を確認
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';
const SHEET_NAME = '売主リスト';

async function checkAA5852FromSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('\n=== スプレッドシートからAA5852を確認 ===\n');

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:Z`,
  });
  const rows = dataResponse.data.values || [];

  // AA5852を探す
  const sellerNumberIndex = headers.indexOf('売主番号');
  const addressIndex = headers.indexOf('住所');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    
    if (sellerNumber === 'AA5852') {
      console.log('売主番号:', sellerNumber);
      console.log('住所:', row[addressIndex]);
      console.log('行番号:', i + 2);
      
      // 主要なフィールドを表示
      console.log('\n主要フィールド:');
      for (let j = 0; j < Math.min(headers.length, row.length); j++) {
        if (row[j]) {
          console.log(`  ${headers[j]}: ${row[j]}`);
        }
      }
      break;
    }
  }
}

checkAA5852FromSheet().catch(console.error);
