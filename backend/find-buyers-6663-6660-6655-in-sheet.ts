/**
 * スプレッドシートで買主番号 6663, 6660, 6655 を探す
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function findBuyers() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  
  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!1:1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 買主番号と買主IDの列インデックスを特定
  const buyerNumberColIndex = headers.findIndex((h: string) => h === '買主番号');
  const buyerIdColIndex = headers.findIndex((h: string) => h === '買主ID');
  const nameColIndex = headers.findIndex((h: string) => h === '●氏名・会社名');
  const phoneColIndex = headers.findIndex((h: string) => h === '●電話番号\n（ハイフン不要）');
  const emailColIndex = headers.findIndex((h: string) => h === '●メアド');
  const propertyNumberColIndex = headers.findIndex((h: string) => h === '物件番号');
  
  console.log('=== 列インデックス ===');
  console.log(`買主番号: ${buyerNumberColIndex} (${buyerNumberColIndex >= 0 ? String.fromCharCode(65 + buyerNumberColIndex) : 'N/A'}列)`);
  console.log(`買主ID: ${buyerIdColIndex} (${buyerIdColIndex >= 0 ? String.fromCharCode(65 + buyerIdColIndex) : 'N/A'}列)`);
  console.log(`氏名: ${nameColIndex}`);
  console.log(`電話番号: ${phoneColIndex}`);
  console.log(`メアド: ${emailColIndex}`);
  console.log(`物件番号: ${propertyNumberColIndex}`);
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A2:GZ',
  });
  const rows = dataResponse.data.values || [];
  
  console.log(`\n総行数: ${rows.length}`);
  
  // 対象の買主番号を探す
  const targetNumbers = ['6663', '6660', '6655'];
  
  console.log('\n=== 対象買主の検索 ===');
  
  for (const targetNum of targetNumbers) {
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const buyerNumber = buyerNumberColIndex >= 0 ? String(row[buyerNumberColIndex] || '').trim() : '';
      
      if (buyerNumber === targetNum) {
        found = true;
        console.log(`\n買主番号 ${targetNum}: 行 ${i + 2} に存在`);
        console.log(`  買主ID: ${buyerIdColIndex >= 0 ? row[buyerIdColIndex] || '(空)' : '(列不明)'}`);
        console.log(`  氏名: ${nameColIndex >= 0 ? row[nameColIndex] || '(空)' : '(列不明)'}`);
        console.log(`  電話番号: ${phoneColIndex >= 0 ? row[phoneColIndex] || '(空)' : '(列不明)'}`);
        console.log(`  メアド: ${emailColIndex >= 0 ? row[emailColIndex] || '(空)' : '(列不明)'}`);
        console.log(`  物件番号: ${propertyNumberColIndex >= 0 ? row[propertyNumberColIndex] || '(空)' : '(列不明)'}`);
        break;
      }
    }
    
    if (!found) {
      console.log(`\n買主番号 ${targetNum}: スプレッドシートに存在しません`);
    }
  }
  
  // 最新の買主番号を確認
  console.log('\n=== 最新の買主番号 ===');
  const buyerNumbers: number[] = [];
  for (const row of rows) {
    const buyerNumber = buyerNumberColIndex >= 0 ? row[buyerNumberColIndex] : null;
    if (buyerNumber && !isNaN(Number(buyerNumber))) {
      buyerNumbers.push(Number(buyerNumber));
    }
  }
  
  buyerNumbers.sort((a, b) => b - a);
  console.log(`有効な買主番号数: ${buyerNumbers.length}`);
  console.log(`最大の買主番号: ${buyerNumbers[0]}`);
  console.log(`最小の買主番号: ${buyerNumbers[buyerNumbers.length - 1]}`);
  
  console.log('\n最新10件の買主番号:');
  for (let i = 0; i < Math.min(10, buyerNumbers.length); i++) {
    console.log(`  ${i + 1}. ${buyerNumbers[i]}`);
  }
  
  // 6650-6670の範囲を確認
  console.log('\n6650-6670の範囲の買主番号:');
  const rangeNumbers = buyerNumbers.filter(n => n >= 6650 && n <= 6670);
  if (rangeNumbers.length > 0) {
    rangeNumbers.sort((a, b) => a - b);
    rangeNumbers.forEach(n => console.log(`  ${n}`));
  } else {
    console.log('  この範囲の買主番号は存在しません');
  }
}

findBuyers().catch(console.error);
