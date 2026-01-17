import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkInquiryDateFormat() {
  console.log('=== 反響日付のフォーマット確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    const columnName = '訪問取得日\n年/月/日';
    
    // Find rows with visit acquisition dates
    const rowsWithVisitAcq = rows.filter(row => row[columnName]);
    
    console.log(`訪問取得日ありの行数: ${rowsWithVisitAcq.length}\n`);
    
    // Show first 30 rows with visit acquisition dates
    console.log('最初の30件のサンプル:\n');
    for (let i = 0; i < Math.min(30, rowsWithVisitAcq.length); i++) {
      const row = rowsWithVisitAcq[i];
      console.log(`${i + 1}. ${row['売主番号']}`);
      console.log(`   反響日付: "${row['反響日付']}" (型: ${typeof row['反響日付']})`);
      console.log(`   訪問取得日: "${row[columnName]}"`);
      console.log(`   確度: "${row['確度']}"`);
      console.log('');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkInquiryDateFormat();
