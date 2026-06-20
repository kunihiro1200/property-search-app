import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkLatestSellersInSheet() {
  console.log('🔍 スプレッドシートの最新売主を確認中...\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = '売主リスト';

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });

  const rows = dataResponse.data.values || [];
  
  console.log(`📊 スプレッドシートの総行数: ${rows.length}`);
  console.log('\n最新の20件の売主番号:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 最後の20行を表示（ヘッダーを除く）
  const startIndex = Math.max(1, rows.length - 20);
  for (let i = startIndex; i < rows.length; i++) {
    const sellerNumber = rows[i][0];
    if (sellerNumber) {
      console.log(`${i}行目: ${sellerNumber}`);
    }
  }
  
  // AA13508を検索
  console.log('\n🔍 AA13508を検索中...');
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'AA13508') {
      console.log(`✅ AA13508が見つかりました（${i}行目）`);
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log('❌ AA13508は見つかりませんでした');
  }
}

checkLatestSellersInSheet().catch(console.error);
