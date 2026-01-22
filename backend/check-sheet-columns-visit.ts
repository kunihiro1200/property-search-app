import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkColumns() {
  console.log('=== スプレッドシートの列構造を確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    
    // 全データを取得（最初の1行だけ見る）
    const rows = await sheetsClient.readAll();
    if (rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    const headers = Object.keys(rows[0]);

    console.log('全ての列名:');
    headers.forEach((header, index) => {
      console.log(`${index + 1}. "${header}"`);
    });

    console.log('\n訪問関連の列:');
    const visitRelated = headers.filter(h => 
      h.includes('訪問') || h.includes('営担') || h.includes('査定')
    );
    visitRelated.forEach(header => {
      console.log(`- "${header}"`);
    });

    // サンプルデータを1件表示
    console.log('\nサンプルデータ（1件目）:');
    const firstRow = rows[0];
    visitRelated.forEach(header => {
      console.log(`${header}: ${firstRow[header]}`);
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkColumns();
