import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDateFormats() {
  console.log('🔍 Checking date formats in spreadsheet...\n');

  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows\n`);

    const dateColumns = ['反響日付', '次電日', '契約年月 他決は分かった時点', '訪問日 Y/M/D'];
    const invalidDates: { [key: string]: Array<{ sellerNumber: string; value: any }> } = {};

    for (const col of dateColumns) {
      invalidDates[col] = [];
    }

    for (const row of rows) {
      const sellerNumber = String(row['売主番号'] || '');
      if (!sellerNumber) continue;

      for (const col of dateColumns) {
        const value = row[col];
        if (!value || value === '') continue;

        const str = String(value).trim();
        
        // Check for invalid patterns
        if (/[a-zA-Zｗｋ]/.test(str) || str.length > 20 || /\d{3,}/.test(str.split(/[\/\-]/).pop() || '')) {
          invalidDates[col].push({ sellerNumber, value });
        }
      }
    }

    console.log('📊 Invalid date formats found:\n');
    for (const col of dateColumns) {
      if (invalidDates[col].length > 0) {
        console.log(`${col}: ${invalidDates[col].length} invalid entries`);
        invalidDates[col].slice(0, 10).forEach(({ sellerNumber, value }) => {
          console.log(`  - ${sellerNumber}: "${value}"`);
        });
        if (invalidDates[col].length > 10) {
          console.log(`  ... and ${invalidDates[col].length - 10} more`);
        }
        console.log();
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkDateFormats().catch(console.error);
