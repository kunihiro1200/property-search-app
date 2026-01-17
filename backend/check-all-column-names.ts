import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllColumnNames() {
  console.log('=== スプレッドシートの全列名を確認 ===\n');

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
      
      console.log(`列数: ${allKeys.length}\n`);
      console.log('=== 全列名リスト ===\n');
      
      allKeys.forEach((key, index) => {
        console.log(`${index + 1}. "${key}"`);
      });
      
      // Search for columns containing "訪問" or "取得"
      console.log('\n=== "訪問" を含む列名 ===');
      const visitColumns = allKeys.filter(k => k.includes('訪問'));
      visitColumns.forEach(col => {
        const sampleValue = rows.slice(0, 100).find(r => r[col])?.[ col];
        console.log(`- "${col}"${sampleValue ? ` (サンプル: ${sampleValue})` : ''}`);
      });
      
      console.log('\n=== "取得" を含む列名 ===');
      const acquisitionColumns = allKeys.filter(k => k.includes('取得'));
      acquisitionColumns.forEach(col => {
        const sampleValue = rows.slice(0, 100).find(r => r[col])?.[col];
        console.log(`- "${col}"${sampleValue ? ` (サンプル: ${sampleValue})` : ''}`);
      });
      
      // Check columns around position 26 (Z column)
      console.log('\n=== 25-30番目の列名（Z列付近） ===');
      for (let i = 24; i < Math.min(30, allKeys.length); i++) {
        const key = allKeys[i];
        const sampleValue = rows.slice(0, 100).find(r => r[key])?.[key];
        console.log(`${i + 1}. "${key}"${sampleValue ? ` (サンプル: ${sampleValue})` : ''}`);
      }
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkAllColumnNames();
