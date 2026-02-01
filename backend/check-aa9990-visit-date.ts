/**
 * AA9990の訪問日データを確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== AA9990の訪問日データを確認 ===\n');

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

  // カラムインデックスを取得
  const sellerNumberIdx = headers.findIndex((h: string) => h === '売主番号');
  const visitDateIdx = headers.findIndex((h: string) => h === '訪問日 Y/M/D');
  const visitAssigneeIdx = headers.findIndex((h: string) => h === '営担');

  console.log(`売主番号: 列${sellerNumberIdx + 1}`);
  console.log(`訪問日: 列${visitDateIdx + 1}`);
  console.log(`営担: 列${visitAssigneeIdx + 1}`);

  // AA9990のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:DZ`,
  });

  const rows = dataResponse.data.values || [];
  
  // AA9990を探す
  const aa9990Row = rows.find((row: string[]) => row[sellerNumberIdx] === 'AA9990');
  
  if (aa9990Row) {
    console.log('\nAA9990のデータ:');
    console.log(`  売主番号: "${aa9990Row[sellerNumberIdx]}"`);
    console.log(`  訪問日（列${visitDateIdx + 1}）: "${aa9990Row[visitDateIdx] || '(空)'}"`);
    console.log(`  営担（列${visitAssigneeIdx + 1}）: "${aa9990Row[visitAssigneeIdx] || '(空)'}"`);
    
    // 訪問日の値の詳細
    const visitDateValue = aa9990Row[visitDateIdx];
    if (visitDateValue) {
      console.log(`\n訪問日の詳細:`);
      console.log(`  値: "${visitDateValue}"`);
      console.log(`  型: ${typeof visitDateValue}`);
      console.log(`  長さ: ${visitDateValue.length}`);
      
      // 数値かどうか確認（Excelシリアル値の可能性）
      const numValue = Number(visitDateValue);
      if (!isNaN(numValue) && numValue > 40000) {
        // Excelシリアル値を日付に変換
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
        console.log(`  Excelシリアル値として解釈: ${date.toISOString().split('T')[0]}`);
      }
    }
  } else {
    console.log('AA9990が見つかりません');
  }

  // 訪問日がある売主を数える
  let visitDateCount = 0;
  let visitDateEmptyCount = 0;
  
  rows.forEach((row: string[]) => {
    const visitDate = row[visitDateIdx];
    if (visitDate && visitDate.trim()) {
      visitDateCount++;
    } else {
      visitDateEmptyCount++;
    }
  });

  console.log(`\nスプレッドシートの訪問日統計:`);
  console.log(`  訪問日あり: ${visitDateCount}件`);
  console.log(`  訪問日なし: ${visitDateEmptyCount}件`);
}

main().catch(console.error);
