import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkVisitAcquisitionDataDetail() {
  console.log('=== 訪問取得日\\n年/月/日 列の詳細確認 ===\n');

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

    // Check for the exact column name
    const columnName = '訪問取得日\n年/月/日';
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      const allKeys = Object.keys(firstRow);
      
      console.log(`列名 "${columnName}" が存在するか: ${allKeys.includes(columnName)}`);
      console.log(`\n最初の10行のデータをチェック:\n`);
      
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        const sellerNumber = row['売主番号'];
        const visitAcqDate = row[columnName];
        const visitDate = row['訪問日 Y/M/D'];
        
        console.log(`${i + 1}. 売主番号: ${sellerNumber || '(なし)'}`);
        console.log(`   訪問取得日\\n年/月/日: "${visitAcqDate}" (型: ${typeof visitAcqDate})`);
        console.log(`   訪問日 Y/M/D: "${visitDate}"`);
        console.log('');
      }
      
      // Count non-empty values
      let nonEmptyCount = 0;
      let emptyCount = 0;
      const sampleValues: string[] = [];
      
      for (const row of rows) {
        const value = row[columnName];
        if (value && value.toString().trim() !== '') {
          nonEmptyCount++;
          if (sampleValues.length < 5) {
            sampleValues.push(`${row['売主番号']}: ${value}`);
          }
        } else {
          emptyCount++;
        }
      }
      
      console.log(`\n=== 統計 ===`);
      console.log(`空でない値: ${nonEmptyCount} 件`);
      console.log(`空の値: ${emptyCount} 件`);
      
      if (sampleValues.length > 0) {
        console.log(`\nサンプル値:`);
        sampleValues.forEach(v => console.log(`  ${v}`));
      }
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkVisitAcquisitionDataDetail();
