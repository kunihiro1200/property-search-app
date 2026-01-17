import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function testReceptionDateSync() {
  console.log('=== 受付日の同期処理テスト ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  console.log('ヘッダー一覧:');
  headers.forEach((header, index) => {
    if (header.includes('受付') || header.includes('日')) {
      console.log(`  ${index}: "${header}"`);
    }
  });

  // 最初の5行のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:Z6`,
  });
  const rows = dataResponse.data.values || [];

  const mapper = new BuyerColumnMapper();
  
  console.log('\n受付日のマッピングテスト:');
  console.log('スプレッドシートカラム名:', mapper.getSpreadsheetColumnName('reception_date'));
  
  const receptionDateIndex = headers.indexOf('受付日');
  console.log(`受付日の列インデックス: ${receptionDateIndex}`);

  console.log('\n最初の5行のデータ処理結果:');
  rows.forEach((row, index) => {
    const buyerNumber = row[4]; // 買主番号は5列目
    const rawReceptionDate = row[receptionDateIndex];
    
    const mappedData = mapper.mapSpreadsheetToDatabase(headers, row);
    
    console.log(`\n行${index + 2}: 買主番号=${buyerNumber}`);
    console.log(`  スプレッドシートの値: "${rawReceptionDate}"`);
    console.log(`  マッピング後の値: "${mappedData.reception_date}"`);
    console.log(`  型: ${typeof mappedData.reception_date}`);
    
    if (rawReceptionDate && !mappedData.reception_date) {
      console.log(`  ❌ 問題: スプレッドシートにデータがあるのに、マッピング後はnullになっています`);
    }
  });

  console.log('\n=== テスト完了 ===');
}

testReceptionDateSync().catch(console.error);
