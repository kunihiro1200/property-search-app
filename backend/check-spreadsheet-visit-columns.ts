import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSpreadsheetColumns() {
  console.log('=== スプレッドシートの列名を確認 ===\n');

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

    if (rows.length > 0) {
      const firstRow = rows[0];
      const allKeys = Object.keys(firstRow);
      
      console.log('=== すべての列名 ===');
      allKeys.forEach((key, index) => {
        console.log(`${index + 1}. "${key}"`);
      });

      console.log('\n=== "訪問" を含む列名 ===');
      const visitKeys = allKeys.filter(key => key.includes('訪問'));
      visitKeys.forEach(key => {
        console.log(`- "${key}"`);
        // サンプルデータを表示
        const sampleValues = rows.slice(0, 5)
          .map(row => row[key])
          .filter(val => val);
        if (sampleValues.length > 0) {
          console.log(`  サンプル値: ${sampleValues.slice(0, 3).join(', ')}`);
        }
      });

      console.log('\n=== "取得" を含む列名 ===');
      const acquisitionKeys = allKeys.filter(key => key.includes('取得'));
      acquisitionKeys.forEach(key => {
        console.log(`- "${key}"`);
        // サンプルデータを表示
        const sampleValues = rows.slice(0, 5)
          .map(row => row[key])
          .filter(val => val);
        if (sampleValues.length > 0) {
          console.log(`  サンプル値: ${sampleValues.slice(0, 3).join(', ')}`);
        }
      });

      // Z列付近の列名を確認（Z列は26番目）
      console.log('\n=== 25-30番目の列名（Z列付近） ===');
      allKeys.slice(24, 30).forEach((key, index) => {
        console.log(`${index + 25}. "${key}"`);
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkSpreadsheetColumns();
