import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkNovember2025SpreadsheetOnly() {
  console.log('=== スプレッドシートから2025年11月の訪問取得日を確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    console.log(`スプレッドシートから ${rows.length} 件取得\n`);

    // 全ての行から訪問取得日が2025年11月の行を抽出
    const november2025Visits = rows.filter(row => {
      const visitAcqDate = row['訪問取得日\n年/月/日'];
      if (!visitAcqDate || visitAcqDate === 'null') return false;
      const dateStr = visitAcqDate.toString();
      return dateStr.includes('2025/11') || dateStr.includes('2025-11');
    });

    console.log(`訪問取得日が2025年11月: ${november2025Visits.length}件\n`);

    console.log('=== 訪問取得日が2025年11月の売主リスト ===\n');
    november2025Visits.forEach((row, index) => {
      console.log(`${index + 1}. ${row['売主番号']}`);
      console.log(`   反響日付: ${row['反響日付']}`);
      console.log(`   訪問取得日: ${row['訪問取得日\n年/月/日']}`);
      console.log(`   訪問日: ${row['訪問日 Y/M/D']}`);
      console.log(`   状況: ${row['状況（当社）']}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkNovember2025SpreadsheetOnly();
