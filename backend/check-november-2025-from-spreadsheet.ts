import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkNovember2025FromSpreadsheet() {
  console.log('=== スプレッドシートから直接2025年11月の訪問取得日を確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('スプレッドシートに接続しました\n');

    const rows = await sheetsClient.readAll();
    console.log(`スプレッドシートから ${rows.length} 件のデータを取得しました\n`);

    const columnName = '訪問取得日\n年/月/日';
    const inquiryDateColumn = '反響日付';
    
    // 2025年11月の反響日付を持つ行をフィルタ
    const november2025Rows = rows.filter(row => {
      const inquiryDate = row[inquiryDateColumn];
      if (!inquiryDate || inquiryDate === 'null') return false;
      
      const dateStr = inquiryDate.toString();
      // 2025/11/XX の形式をチェック
      return dateStr.startsWith('2025/11/') || dateStr.startsWith('2025-11-');
    });

    console.log(`2025年11月の反響: ${november2025Rows.length}件\n`);

    // 訪問取得日が存在する行をカウント
    const withVisitAcquisition = november2025Rows.filter(row => {
      const visitAcqDate = row[columnName];
      return visitAcqDate && visitAcqDate !== 'null' && visitAcqDate.toString().trim() !== '';
    });

    console.log(`訪問取得日が存在: ${withVisitAcquisition.length}件\n`);

    console.log('=== 訪問取得日が存在する売主リスト ===\n');
    withVisitAcquisition.forEach((row, index) => {
      console.log(`${index + 1}. ${row['売主番号']}`);
      console.log(`   反響日付: ${row[inquiryDateColumn]}`);
      console.log(`   訪問取得日: ${row[columnName]}`);
      console.log(`   訪問日: ${row['訪問日 Y/M/D']}`);
      console.log(`   状況: ${row['状況（当社）']}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkNovember2025FromSpreadsheet();
