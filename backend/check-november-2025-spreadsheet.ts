import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkNovember2025Spreadsheet() {
  console.log('=== スプレッドシートの2025年11月データ確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    console.log(`スプレッドシートから ${rows.length} 件のデータを取得しました\n`);

    const columnName = '訪問取得日\n年/月/日';
    
    // Filter for November 2025 inquiry dates with visit acquisition dates
    const november2025Rows = rows.filter(row => {
      const inquiryDate = row['反響日付'];
      const visitAcqDate = row[columnName];
      const confidence = row['確度'];
      
      if (!inquiryDate || !visitAcqDate) return false;
      if (confidence === 'D' || confidence === 'ダブり') return false;
      
      // Check if inquiry date is in November 2025
      const dateStr = inquiryDate.toString();
      if (dateStr.includes('2025') && (dateStr.includes('11/') || dateStr.includes('/11/'))) {
        return true;
      }
      
      // Try parsing as date
      try {
        const date = new Date(inquiryDate);
        if (date.getFullYear() === 2025 && date.getMonth() === 10) { // Month is 0-indexed
          return true;
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      return false;
    });

    console.log(`2025年11月の訪問取得日ありデータ: ${november2025Rows.length} 件\n`);

    if (november2025Rows.length > 0) {
      console.log('詳細データ:');
      november2025Rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row['売主番号']} - ${row['名前(漢字のみ）']}`);
        console.log(`   反響日: ${row['反響日付']}`);
        console.log(`   訪問取得日: ${row[columnName]}`);
        console.log(`   確度: ${row['確度']}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkNovember2025Spreadsheet();
