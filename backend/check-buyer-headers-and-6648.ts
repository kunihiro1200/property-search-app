import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkHeaders() {
  console.log('=== スプレッドシートのヘッダーと買主6648の確認 ===\n');

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

  console.log('最初の30カラムのヘッダー:');
  for (let i = 0; i < Math.min(30, headers.length); i++) {
    console.log(`  [${i}] ${headers[i]}`);
  }
  console.log();

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:D5000`, // 最初の4カラムだけ取得して検索
  });
  const rows = dataResponse.data.values || [];

  console.log(`総行数: ${rows.length}\n`);

  // 買主番号で6647と6648を検索
  console.log('買主6647と6648を検索中...\n');
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = String(row[0] || '').trim();
    
    if (buyerNumber === '6647' || buyerNumber === '6648') {
      console.log(`✅ 買主${buyerNumber}が見つかりました`);
      console.log(`  行番号: ${i + 2}`);
      console.log(`  カラム0 (買主番号): ${row[0]}`);
      console.log(`  カラム1: ${row[1]}`);
      console.log(`  カラム2: ${row[2]}`);
      console.log(`  カラム3: ${row[3]}`);
      console.log();
    }
  }
}

checkHeaders().catch(console.error);
