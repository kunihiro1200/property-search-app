/**
 * スプレッドシートのvisit_date（訪問日）カラムの値を確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== スプレッドシートの訪問日カラムを確認 ===\n');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);

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

  // 訪問日カラムを探す
  const visitDateIndex = headers.findIndex((h: string) => 
    h && (h.includes('訪問日') || h === '訪問日 \nY/M/D' || h === '訪問日\nY/M/D')
  );
  const visitAssigneeIndex = headers.findIndex((h: string) => h === '営担');

  console.log(`\n訪問日カラム: ${visitDateIndex >= 0 ? `列${visitDateIndex + 1} (${headers[visitDateIndex]})` : '見つからない'}`);
  console.log(`営担カラム: ${visitAssigneeIndex >= 0 ? `列${visitAssigneeIndex + 1} (${headers[visitAssigneeIndex]})` : '見つからない'}`);

  if (visitDateIndex < 0) {
    console.log('\n訪問日に関連するカラムを検索:');
    headers.forEach((h: string, i: number) => {
      if (h && (h.includes('訪問') || h.includes('日'))) {
        console.log(`  列${i + 1}: "${h}"`);
      }
    });
    return;
  }

  // データを取得（最初の100行）
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:CZ101`,
  });

  const rows = dataResponse.data.values || [];
  console.log(`\nデータ行数: ${rows.length}`);

  // 訪問日に値がある行を確認
  const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
  
  let withVisitDate = 0;
  let withoutVisitDate = 0;
  const samples: { sellerNumber: string; visitDate: string; visitAssignee: string }[] = [];

  rows.forEach((row: string[], i: number) => {
    const visitDate = row[visitDateIndex - 1]; // -1 because data starts from column B
    const visitAssignee = visitAssigneeIndex >= 0 ? row[visitAssigneeIndex - 1] : '';
    const sellerNumber = sellerNumberIndex >= 0 ? row[sellerNumberIndex - 1] : `行${i + 2}`;

    if (visitDate && visitDate.trim()) {
      withVisitDate++;
      if (samples.length < 20) {
        samples.push({ sellerNumber, visitDate, visitAssignee });
      }
    } else if (visitAssignee && visitAssignee.trim()) {
      withoutVisitDate++;
    }
  });

  console.log(`\n訪問日に値がある行: ${withVisitDate}件`);
  console.log(`営担はあるが訪問日がない行: ${withoutVisitDate}件`);

  console.log('\n=== 訪問日がある売主のサンプル ===');
  samples.forEach(s => {
    console.log(`  ${s.sellerNumber}: 訪問日="${s.visitDate}", 営担="${s.visitAssignee}"`);
  });

  // 全データを取得して訪問日がある売主を全て確認
  console.log('\n\n=== 全データから訪問日がある売主を検索 ===');
  const fullDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:CZ`,
  });

  const allRows = fullDataResponse.data.values || [];
  console.log(`全データ行数: ${allRows.length}`);

  const allWithVisitDate: { sellerNumber: string; visitDate: string; visitAssignee: string }[] = [];
  
  allRows.forEach((row: string[]) => {
    const visitDate = row[visitDateIndex - 1];
    const visitAssignee = visitAssigneeIndex >= 0 ? row[visitAssigneeIndex - 1] : '';
    const sellerNumber = sellerNumberIndex >= 0 ? row[sellerNumberIndex - 1] : '';

    if (visitDate && visitDate.trim()) {
      allWithVisitDate.push({ sellerNumber, visitDate, visitAssignee });
    }
  });

  console.log(`\n訪問日に値がある売主: ${allWithVisitDate.length}件`);
  
  if (allWithVisitDate.length > 0) {
    console.log('\n全リスト:');
    allWithVisitDate.forEach(s => {
      console.log(`  ${s.sellerNumber}: 訪問日="${s.visitDate}", 営担="${s.visitAssignee}"`);
    });
  }
}

main().catch(console.error);
