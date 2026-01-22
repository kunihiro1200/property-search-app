/**
 * 買主スプレッドシートの構造を詳しく確認
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function debugSheetStructure() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  
  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A1:Z1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  console.log('=== ヘッダー (A-Z列) ===');
  headers.forEach((h: string, i: number) => {
    const col = String.fromCharCode(65 + i);
    console.log(`  ${col}列 (${i}): ${h}`);
  });
  
  // 最初の5行のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A2:Z6',
  });
  const rows = dataResponse.data.values || [];
  
  console.log('\n=== 最初の5行のデータ ===');
  rows.forEach((row, rowIndex) => {
    console.log(`\n行 ${rowIndex + 2}:`);
    row.forEach((cell: string, colIndex: number) => {
      const col = String.fromCharCode(65 + colIndex);
      const header = headers[colIndex] || '(ヘッダーなし)';
      if (cell) {
        console.log(`  ${col}列 (${header}): ${cell}`);
      }
    });
  });
  
  // 最後の5行のデータを取得
  const lastRowsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A4136:Z4141',
  });
  const lastRows = lastRowsResponse.data.values || [];
  
  console.log('\n=== 最後の5行のデータ ===');
  lastRows.forEach((row, rowIndex) => {
    console.log(`\n行 ${4136 + rowIndex}:`);
    row.forEach((cell: string, colIndex: number) => {
      const col = String.fromCharCode(65 + colIndex);
      const header = headers[colIndex] || '(ヘッダーなし)';
      if (cell) {
        console.log(`  ${col}列 (${header}): ${cell}`);
      }
    });
  });
  
  // 「No」や「番号」を含む列を探す
  console.log('\n=== ID関連の列を探す ===');
  headers.forEach((h: string, i: number) => {
    const col = String.fromCharCode(65 + i);
    if (h && (h.includes('No') || h.includes('番号') || h.includes('ID') || h === 'No.' || h === 'No')) {
      console.log(`  ${col}列 (${i}): ${h}`);
    }
  });
}

debugSheetStructure().catch(console.error);
