// 行1995のVARCHAR(50)エラーを診断
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const PROBLEM_ROW = 6; // スプレッドシートの行番号（processing row 6）

async function diagnose() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const mapper = new BuyerColumnMapper();

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // 問題の行を取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${PROBLEM_ROW}:GZ${PROBLEM_ROW}`,
  });
  const row = dataResponse.data.values?.[0] || [];

  console.log(`\n=== 行 ${PROBLEM_ROW} の診断 ===\n`);

  // 買主番号を表示
  const buyerNumberIndex = headers.indexOf('買主番号');
  if (buyerNumberIndex >= 0) {
    console.log(`買主番号: ${row[buyerNumberIndex]}`);
  }

  // マッピング後のデータを取得
  const mappedData = mapper.mapSpreadsheetToDatabase(headers, row);
  
  console.log('\n=== 50文字を超えるフィールド ===\n');
  
  const longFields: Array<{ field: string; dbColumn: string; length: number; value: string }> = [];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const value = String(row[i] || '');
    
    if (value.length > 50) {
      // このフィールドがどのDBカラムにマッピングされるか確認
      const dbColumn = (mapper as any).spreadsheetToDb[header];
      
      longFields.push({
        field: header,
        dbColumn: dbColumn || '(マッピングなし)',
        length: value.length,
        value: value.substring(0, 100)
      });
    }
  }

  // 長さでソート
  longFields.sort((a, b) => b.length - a.length);

  longFields.forEach(({ field, dbColumn, length, value }) => {
    console.log(`フィールド: ${field}`);
    console.log(`  DBカラム: ${dbColumn}`);
    console.log(`  長さ: ${length}文字`);
    console.log(`  内容: ${value}${length > 100 ? '...' : ''}`);
    console.log('');
  });

  // マッピング後のデータで50文字を超えるものを確認
  console.log('\n=== マッピング後のデータ（50文字超） ===\n');
  
  for (const [dbColumn, value] of Object.entries(mappedData)) {
    if (value && typeof value === 'string' && value.length > 50) {
      console.log(`${dbColumn}: ${value.length}文字`);
      console.log(`  内容: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      console.log('');
    }
  }
}

diagnose().catch(console.error);
