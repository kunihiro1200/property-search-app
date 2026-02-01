/**
 * 特定の売主のスプレッドシートデータを確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== 特定の売主のスプレッドシートデータを確認 ===\n');

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
  
  // 訪問関連のカラムインデックスを探す
  let sellerNumberIdx = -1;
  let visitDateIdx = -1;
  let visitAssigneeIdx = -1;

  headers.forEach((h: string, i: number) => {
    if (h === '売主番号') sellerNumberIdx = i;
    if (h && h.includes('訪問日')) {
      console.log(`訪問日カラム発見: 列${i + 1} = "${h}"`);
      visitDateIdx = i;
    }
    if (h === '営担') {
      console.log(`営担カラム発見: 列${i + 1} = "${h}"`);
      visitAssigneeIdx = i;
    }
  });

  console.log(`\n売主番号: 列${sellerNumberIdx + 1}`);
  console.log(`訪問日: 列${visitDateIdx + 1}`);
  console.log(`営担: 列${visitAssigneeIdx + 1}`);

  // データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:CZ`,
  });

  const rows = dataResponse.data.values || [];
  
  // 確認したい売主番号
  const targetSellers = ['AA9990', 'AA9945', 'AA9935', 'AA9928', 'AA9920', 'AA9743', 'AA13506', 'AA5039', 'AA13508'];

  console.log('\n=== 特定の売主のデータ ===\n');
  
  for (const sellerNumber of targetSellers) {
    const row = rows.find((r: string[]) => r[sellerNumberIdx] === sellerNumber);
    if (row) {
      const visitDate = row[visitDateIdx] || '(空)';
      const visitAssignee = row[visitAssigneeIdx] || '(空)';
      console.log(`${sellerNumber}:`);
      console.log(`  営担（列${visitAssigneeIdx + 1}）: "${visitAssignee}"`);
      console.log(`  訪問日（列${visitDateIdx + 1}）: "${visitDate}"`);
      console.log('');
    } else {
      console.log(`${sellerNumber}: スプレッドシートに見つかりません\n`);
    }
  }

  // 営担があって訪問日もある売主を数える
  let bothCount = 0;
  let assigneeOnlyCount = 0;
  
  rows.forEach((row: string[]) => {
    const visitAssignee = row[visitAssigneeIdx];
    const visitDate = row[visitDateIdx];
    
    if (visitAssignee && visitAssignee.trim() && visitAssignee !== '外す') {
      if (visitDate && visitDate.trim()) {
        bothCount++;
      } else {
        assigneeOnlyCount++;
      }
    }
  });

  console.log('=== スプレッドシートでの集計 ===');
  console.log(`営担あり・訪問日あり: ${bothCount}件`);
  console.log(`営担あり・訪問日なし: ${assigneeOnlyCount}件`);
}

main().catch(console.error);
