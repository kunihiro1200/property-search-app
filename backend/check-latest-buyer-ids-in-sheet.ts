/**
 * スプレッドシートの最新買主IDを確認
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkLatestBuyerIds() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  
  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A1:BZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 買主IDの列インデックスを特定
  const buyerIdColIndex = headers.findIndex((h: string) => h === '買主ID');
  console.log(`買主ID列インデックス: ${buyerIdColIndex} (列: ${String.fromCharCode(65 + buyerIdColIndex)})`);
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A2:BZ10000',
  });
  const rows = dataResponse.data.values || [];
  
  console.log(`\nスプレッドシート総行数: ${rows.length}`);
  
  // 買主IDを収集して数値でソート
  const buyerIds: number[] = [];
  for (const row of rows) {
    const buyerId = row[buyerIdColIndex];
    if (buyerId && !isNaN(Number(buyerId))) {
      buyerIds.push(Number(buyerId));
    }
  }
  
  buyerIds.sort((a, b) => b - a); // 降順ソート
  
  console.log(`\n有効な買主ID数: ${buyerIds.length}`);
  console.log(`\n最大の買主ID: ${buyerIds[0]}`);
  console.log(`最小の買主ID: ${buyerIds[buyerIds.length - 1]}`);
  
  console.log('\n最新20件の買主ID:');
  for (let i = 0; i < Math.min(20, buyerIds.length); i++) {
    console.log(`  ${i + 1}. ${buyerIds[i]}`);
  }
  
  // 6650-6670の範囲を確認
  console.log('\n6650-6670の範囲の買主ID:');
  const rangeIds = buyerIds.filter(id => id >= 6650 && id <= 6670);
  if (rangeIds.length > 0) {
    rangeIds.forEach(id => console.log(`  ${id}`));
  } else {
    console.log('  この範囲の買主IDは存在しません');
  }
  
  // 欠番を確認
  console.log('\n6640-6670の範囲で欠番を確認:');
  for (let id = 6640; id <= 6670; id++) {
    if (!buyerIds.includes(id)) {
      console.log(`  ${id} - 欠番`);
    }
  }
}

checkLatestBuyerIds().catch(console.error);
