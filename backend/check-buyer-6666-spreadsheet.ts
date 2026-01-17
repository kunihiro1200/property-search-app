import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkBuyer6666InSpreadsheet() {
  console.log('=== スプレッドシートから買主番号6666を検索 ===\n');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  console.log(`ヘッダー数: ${headers.length}`);
  
  // 買主番号の列インデックスを探す
  const buyerNumberIndex = headers.indexOf('買主番号');
  console.log(`買主番号の列インデックス: ${buyerNumberIndex}`);
  
  // 内覧結果・後続対応の列インデックスを探す
  const viewingResultIndex = headers.indexOf('★内覧結果・後続対応');
  console.log(`★内覧結果・後続対応の列インデックス: ${viewingResultIndex}`);
  
  // 後続担当の列インデックスを探す
  const followUpAssigneeIndex = headers.indexOf('後続担当');
  console.log(`後続担当の列インデックス: ${followUpAssigneeIndex}`);
  
  if (buyerNumberIndex === -1) {
    console.log('\n買主番号列が見つかりません');
    return;
  }
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`\nデータ行数: ${rows.length}`);
  
  // 買主番号6666を探す
  let found = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (String(buyerNumber).trim() === '6666') {
      found = true;
      const rowNumber = i + 2; // ヘッダー行を考慮
      
      console.log(`\n=== 買主番号6666が見つかりました（行${rowNumber}） ===`);
      console.log(`買主番号: ${buyerNumber}`);
      
      if (viewingResultIndex !== -1) {
        const viewingResult = row[viewingResultIndex];
        console.log(`★内覧結果・後続対応: "${viewingResult}" (型: ${typeof viewingResult}, 長さ: ${viewingResult ? String(viewingResult).length : 0})`);
      } else {
        console.log('★内覧結果・後続対応: 列が見つかりません');
      }
      
      if (followUpAssigneeIndex !== -1) {
        const followUpAssignee = row[followUpAssigneeIndex];
        console.log(`後続担当: "${followUpAssignee}" (型: ${typeof followUpAssignee}, 長さ: ${followUpAssignee ? String(followUpAssignee).length : 0})`);
      } else {
        console.log('後続担当: 列が見つかりません');
      }
      
      // 氏名も表示
      const nameIndex = headers.indexOf('●氏名・会社名');
      if (nameIndex !== -1) {
        console.log(`氏名: ${row[nameIndex]}`);
      }
      
      break;
    }
  }
  
  if (!found) {
    console.log('\n買主番号6666が見つかりませんでした');
  }
}

checkBuyer6666InSpreadsheet().catch(console.error);
