import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSpreadsheetLatestDates() {
  console.log('=== スプレッドシートの最新反響日付を確認 ===\n');

  // Google Sheets API認証
  const auth = new google.auth.GoogleAuth({
    keyFile: './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!1:1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 列インデックスを取得
  const sellerNumberColIdx = headers.findIndex((h: string) => h && h.includes('売主番号'));
  const inquiryYearColIdx = headers.findIndex((h: string) => h && h === '反響年');
  const inquiryDateColIdx = headers.findIndex((h: string) => h && h === '反響日付');
  
  console.log('列インデックス:');
  console.log('  売主番号:', sellerNumberColIdx, `(${headers[sellerNumberColIdx]})`);
  console.log('  反響年:', inquiryYearColIdx, `(${headers[inquiryYearColIdx]})`);
  console.log('  反響日付:', inquiryDateColIdx, `(${headers[inquiryDateColIdx]})`);
  console.log('');

  // 最新の行を取得（最後の100行）
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!A2:BZ',
  });
  const rows = dataResponse.data.values || [];
  
  console.log(`総行数: ${rows.length}`);
  
  // 最新の10行を表示
  console.log('\n【最新の10行】');
  const latestRows = rows.slice(-10);
  latestRows.forEach((row: any[], idx: number) => {
    const sellerNumber = row[sellerNumberColIdx] || '';
    const inquiryYear = row[inquiryYearColIdx] || '';
    const inquiryDate = row[inquiryDateColIdx] || '';
    console.log(`${rows.length - 10 + idx + 1}. ${sellerNumber}: ${inquiryYear}年 ${inquiryDate}`);
  });
  
  // 12/9のデータを探す
  console.log('\n【12/9のデータを検索】');
  const dec9Rows = rows.filter((row: any[]) => {
    const inquiryDate = row[inquiryDateColIdx] || '';
    return inquiryDate.includes('12/9') || inquiryDate.includes('12月9日') || inquiryDate.includes('2025-12-09');
  });
  console.log(`12/9のデータ: ${dec9Rows.length}件`);
  dec9Rows.forEach((row: any[]) => {
    console.log(`  ${row[sellerNumberColIdx]}: ${row[inquiryDateColIdx]}`);
  });
  
  // 12/8のデータを探す
  console.log('\n【12/8のデータを検索】');
  const dec8Rows = rows.filter((row: any[]) => {
    const inquiryDate = row[inquiryDateColIdx] || '';
    return inquiryDate.includes('12/8') || inquiryDate.includes('12月8日') || inquiryDate.includes('2025-12-08');
  });
  console.log(`12/8のデータ: ${dec8Rows.length}件`);
  dec8Rows.forEach((row: any[]) => {
    console.log(`  ${row[sellerNumberColIdx]}: ${row[inquiryDateColIdx]}`);
  });
}

checkSpreadsheetLatestDates().catch(console.error);
