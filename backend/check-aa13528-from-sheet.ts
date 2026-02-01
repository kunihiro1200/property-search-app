/**
 * AA13528のスプレッドシートデータを確認するスクリプト
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1xNj-Db_Y8VHWL_Rq8RvBPz0w7WXNvMQPJLJHqYpHTlk';

async function check() {
  console.log('=== AA13528のスプレッドシートデータ確認 ===\n');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 売主番号列（B列）でAA13528を検索
  const searchResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:B',
  });
  const sellerNumbers = searchResponse.data.values || [];
  
  let rowIndex = -1;
  for (let i = 0; i < sellerNumbers.length; i++) {
    if (sellerNumbers[i][0] === 'AA13528') {
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    console.log('AA13528が見つかりません');
    return;
  }
  
  console.log(`AA13528は行${rowIndex}にあります`);
  
  // その行のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `売主リスト!B${rowIndex}:CZ${rowIndex}`,
  });
  const rowData = dataResponse.data.values?.[0] || [];
  
  // 重要なカラムを表示
  const importantColumns = [
    '売主番号',
    '反響年',
    '反響日付',
    '状況（当社）',
    '状況（売主）',
    '次電日',
  ];
  
  console.log('\nスプレッドシートのデータ:');
  for (const colName of importantColumns) {
    const colIndex = headers.indexOf(colName);
    if (colIndex !== -1) {
      console.log(`  ${colName}: ${rowData[colIndex] || '(空)'}`);
    } else {
      console.log(`  ${colName}: (カラムが見つかりません)`);
    }
  }
  
  // 反響日付のカラムインデックスを探す
  console.log('\n反響日付関連のカラム:');
  headers.forEach((h, i) => {
    if (h && (h.includes('反響') || h.includes('日付'))) {
      console.log(`  列${i}: ${h} = ${rowData[i] || '(空)'}`);
    }
  });
}

check().catch(console.error);
