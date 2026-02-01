/**
 * スプレッドシートのヘッダーを詳細に確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== スプレッドシートのヘッダーを詳細に確認 ===\n');

  // Google Sheets API認証
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];
  console.log('ヘッダー数:', headers.length);

  // 訪問関連のカラムを探す
  console.log('\n=== 訪問関連のカラム ===');
  headers.forEach((h: string, i: number) => {
    if (h && (h.includes('訪問') || h.includes('営担'))) {
      console.log(`  列${i + 1} (${String.fromCharCode(65 + i)}): "${h}"`);
    }
  });

  // 全ヘッダーを表示（列20-50あたり）
  console.log('\n=== 列20-60のヘッダー ===');
  for (let i = 19; i < 60 && i < headers.length; i++) {
    const colLetter = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
    console.log(`  列${i + 1} (${colLetter}): "${headers[i] || '(空)'}"`);
  }

  // 特定の売主のデータを確認
  console.log('\n\n=== 特定の売主（AA13506）のデータを確認 ===');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:CZ`,
  });

  const rows = dataResponse.data.values || [];
  const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
  
  const targetRow = rows.find((row: string[]) => row[sellerNumberIndex - 1] === 'AA13506');
  
  if (targetRow) {
    console.log('AA13506のデータ:');
    // 訪問関連のカラムを表示
    headers.forEach((h: string, i: number) => {
      if (h && (h.includes('訪問') || h.includes('営担'))) {
        const value = targetRow[i - 1] || '(空)';
        console.log(`  ${h}: "${value}"`);
      }
    });
  } else {
    console.log('AA13506が見つかりません');
  }

  // 列Aが空かどうか確認
  console.log('\n\n=== 列Aの確認 ===');
  console.log('列Aのヘッダー:', headers[0] || '(空)');
  
  // 最初の5行のデータを確認
  console.log('\n最初の5行の列A-Cのデータ:');
  for (let i = 0; i < 5 && i < rows.length; i++) {
    console.log(`  行${i + 2}: A="${rows[i][0] || '(空)'}", B="${rows[i][1] || '(空)'}", C="${rows[i][2] || '(空)'}"`);
  }
}

main().catch(console.error);
