import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkAA13508Details() {
  console.log('🔍 AA13508をスプレッドシートから検索中（B列から検索）...\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

  // B列（売主番号）を取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!B:B`,
  });

  const rows = response.data.values || [];
  console.log(`📊 スプレッドシートの総行数: ${rows.length}`);

  // AA13508を検索
  let foundRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'AA13508') {
      foundRow = i + 1; // 1-indexed
      break;
    }
  }

  if (foundRow === -1) {
    console.log('❌ AA13508は見つかりませんでした');
    
    // 最新の10件を表示
    console.log('\n最新の10件の売主番号（B列）:');
    const lastRows = rows.slice(-10);
    lastRows.forEach((row, index) => {
      const rowNumber = rows.length - 10 + index + 1;
      console.log(`  ${rowNumber}行目: ${row[0] || '（空）'}`);
    });
    
    return;
  }

  console.log(`✅ AA13508が見つかりました: ${foundRow}行目\n`);

  // 全データを取得
  const fullResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${foundRow}:${foundRow}`,
  });

  const rowData = fullResponse.data.values?.[0] || [];
  
  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];

  console.log('📋 AA13508のデータ:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 重要なフィールドのみ表示
  const importantFields = [
    '売主番号',
    '名前(漢字のみ）',
    '物件所在地',
    '査定額1（自動計算）v',
    '査定額2（自動計算）v',
    '査定額3（自動計算）v',
    '査定方法',
    '状況（当社）',
    '訪問日 \nY/M/D',
    '営担',
    'サイト',
    '不通',
    'コメント',
  ];

  importantFields.forEach(field => {
    const index = headers.indexOf(field);
    if (index !== -1) {
      const value = rowData[index] || '（空）';
      console.log(`  ${field}: ${value}`);
    } else {
      console.log(`  ${field}: （カラムが見つかりません）`);
    }
  });
}

checkAA13508Details().catch(console.error);
