import * as dotenv from 'dotenv';
import * as path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('=== スタッフ管理スプレッドシート カラム確認 ===\n');

  const SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  const SHEET_NAME = 'スタッフ';

  // 認証
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得（1行目）
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];
  console.log('ヘッダー行（カラム名）:');
  headers.forEach((header, index) => {
    const columnLetter = String.fromCharCode(65 + index); // A, B, C, ...
    console.log(`  ${columnLetter}列: "${header}"`);
  });

  // 最初の10行のデータを取得
  console.log('\n最初の10行のデータ:');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:F11`,
  });

  const rows = dataResponse.data.values || [];
  rows.forEach((row, index) => {
    console.log(`\n${index + 2}行目:`);
    row.forEach((cell, colIndex) => {
      const columnLetter = String.fromCharCode(65 + colIndex);
      console.log(`  ${columnLetter}列: "${cell || '(空)'}"`);
    });
  });

  console.log('\n=== 確認完了 ===');
}

main().catch(console.error);
