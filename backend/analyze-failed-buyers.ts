// 同期に失敗した買主を分析
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

// 失敗した行番号（エラーログから抽出）
const FAILED_ROWS = [
  2061, 2027, 4020, 4021, 2056, 1998, 1905, 2549, 2557,
  // 最初の10件だけ分析
];

async function analyzeFailed() {
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

  console.log('\n=== 失敗した買主の分析 ===\n');

  for (const rowNum of FAILED_ROWS.slice(0, 5)) {
    console.log(`\n--- 行 ${rowNum} ---`);
    
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A${rowNum}:GZ${rowNum}`,
    });
    
    const row = dataResponse.data.values?.[0] || [];
    
    // 買主番号を表示
    const buyerNumberIndex = headers.indexOf('買主番号');
    if (buyerNumberIndex >= 0) {
      console.log(`買主番号: ${row[buyerNumberIndex]}`);
    }
    
    // 50文字を超えるフィールドを探す
    console.log('\n50文字を超えるフィールド:');
    let found = false;
    for (let i = 0; i < Math.min(headers.length, row.length); i++) {
      const value = String(row[i] || '');
      if (value.length > 50) {
        console.log(`  ${headers[i]}: ${value.length}文字`);
        console.log(`    内容: ${value.substring(0, 100)}...`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('  なし');
    }
    
    // 200文字を超えるフィールドも確認
    console.log('\n200文字を超えるフィールド:');
    found = false;
    for (let i = 0; i < Math.min(headers.length, row.length); i++) {
      const value = String(row[i] || '');
      if (value.length > 200) {
        console.log(`  ${headers[i]}: ${value.length}文字`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('  なし');
    }
    
    // 500文字を超えるフィールドも確認
    console.log('\n500文字を超えるフィールド:');
    found = false;
    for (let i = 0; i < Math.min(headers.length, row.length); i++) {
      const value = String(row[i] || '');
      if (value.length > 500) {
        console.log(`  ${headers[i]}: ${value.length}文字`);
        console.log(`    内容: ${value.substring(0, 100)}...`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('  なし');
    }
  }
  
  console.log('\n');
}

analyzeFailed().catch(console.error);
