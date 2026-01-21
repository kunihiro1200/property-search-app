import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkBuyerSheetHeaders() {
  try {
    console.log('買主リストのヘッダーを確認中...\n');

    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();

    // ヘッダー行を取得
    const headers = await sheetsClient['getHeaders']();

    console.log('ヘッダー一覧:');
    console.log('='.repeat(80));
    
    headers.forEach((header, index) => {
      console.log(`${index + 1}. [${String.fromCharCode(65 + index)}列] ${header}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n総カラム数: ${headers.length}個`);

    // 最新の1行を取得（生データ）
    const allRows = await sheetsClient.readAll();
    const latestRow = allRows[allRows.length - 1];

    console.log('\n最新行の生データ:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(latestRow, null, 2));

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

checkBuyerSheetHeaders();
