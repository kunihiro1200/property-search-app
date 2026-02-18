/**
 * 物件リストスプレッドシートのヘッダー行を確認
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkHeaders() {
  console.log('🔍 Checking property list spreadsheet headers...\n');

  const config: any = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
  };

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    config.serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  }

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  console.log('✅ Authenticated\n');

  const rows = await client.readAll();

  if (rows.length === 0) {
    console.log('❌ No data found');
    return;
  }

  console.log(`📊 Total rows: ${rows.length}\n`);
  console.log('📋 First row (headers):\n');
  
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  
  console.log(`Total columns: ${headers.length}\n`);
  
  headers.forEach((header, index) => {
    console.log(`${index + 1}. "${header}"`);
  });

  console.log('\n📝 Sample data (first 3 rows):\n');
  
  rows.slice(0, 3).forEach((row, index) => {
    console.log(`Row ${index + 1}:`);
    console.log(`  物件番号: ${row['物件番号'] || '(not found)'}`);
    console.log(`  所在地: ${row['所在地'] || '(not found)'}`);
    console.log(`  種別: ${row['種別'] || '(not found)'}`);
    console.log('');
  });
}

checkHeaders();
