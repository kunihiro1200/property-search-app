import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkLastRows() {
  console.log('🔍 Checking last rows of property list spreadsheet...\n');

  const config = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: './google-service-account.json',
  };

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  const allRows = await client.readAll();
  console.log(`📊 Total rows: ${allRows.length}`);
  console.log('');

  // 最後の20行を表示
  console.log('📋 Last 20 rows:');
  const lastRows = allRows.slice(-20);
  
  lastRows.forEach((row, index) => {
    const rowNumber = allRows.length - 20 + index + 1;
    const propertyNumber = row['物件番号'];
    const atbbStatus = row['atbb_status'] || row['ATBB_status'] || row['ステータス'];
    
    console.log(`  Row ${rowNumber}: 物件番号=${propertyNumber}, atbb_status=${atbbStatus}`);
  });
}

checkLastRows().catch(console.error);
