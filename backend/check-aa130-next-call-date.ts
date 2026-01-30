/**
 * AA130の次電日をスプレッドシートで確認
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA130NextCallDate() {
  console.log('=== AA130 次電日確認 ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!1:1",
  });
  const headers = headerResponse.data.values?.[0] || [];

  // 次電日のインデックスを探す
  const nextCallDateIdx = headers.findIndex((h: string) => h === '次電日');
  console.log('「次電日」のインデックス:', nextCallDateIdx);
  console.log('ヘッダー名:', headers[nextCallDateIdx]);

  // AA130の行を取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!A2:ZZZ",
  });
  const rows = dataResponse.data.values || [];

  // AA130を探す（B列で検索）
  const aa130Row = rows.find(row => row[1] === 'AA130');
  if (!aa130Row) {
    console.log('AA130が見つかりません');
    return;
  }

  console.log('\nスプレッドシートの次電日:', aa130Row[nextCallDateIdx] || '(空)');

  console.log('\n=== 確認完了 ===');
}

checkAA130NextCallDate().catch(console.error);
