import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function listAllColumnNames() {
  console.log('=== スプレッドシートの全列名を表示 ===\n');

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
      
      console.log(`全列名 (${allKeys.length}個):\n`);
      
      allKeys.forEach((key, index) => {
        // Show the key with special characters visible
        const displayKey = JSON.stringify(key);
        console.log(`${index + 1}. ${displayKey}`);
      });
      
      // Search for columns containing "訪問"
      console.log('\n\n"訪問" を含む列名:');
      const visitColumns = allKeys.filter(key => key.includes('訪問'));
      visitColumns.forEach(key => {
        console.log(`  - ${JSON.stringify(key)}`);
        // Show first non-empty value
        for (const row of rows) {
          if (row[key] && row[key].toString().trim() !== '' && row[key] !== 'null') {
            console.log(`    サンプル値: ${row[key]} (売主番号: ${row['売主番号']})`);
            break;
          }
        }
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

listAllColumnNames();
