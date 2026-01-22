import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkPropertyTypeColumn() {
  console.log('Environment variables:');
  console.log(`  GOOGLE_SHEETS_SPREADSHEET_ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}`);
  console.log(`  GOOGLE_SHEETS_SHEET_NAME: ${process.env.GOOGLE_SHEETS_SHEET_NAME}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH}`);
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  console.log('\nAuthenticating...');
  await sheetsClient.authenticate();
  console.log('Authentication successful!\n');

  const rows = await sheetsClient.readAll();
  
  if (rows.length === 0) {
    console.log('No rows found');
    return;
  }

  // Check first row (headers)
  const firstRow = rows[0];
  console.log('Available columns:');
  Object.keys(firstRow).forEach(key => {
    console.log(`  - ${key}`);
  });

  // Check if 物件種別 exists
  const propertyTypeColumn = '物件種別';
  console.log(`\nChecking for column: ${propertyTypeColumn}`);
  console.log(`Column exists: ${propertyTypeColumn in firstRow}`);

  // Sample some rows to see property_type values
  console.log(`\nSample property_type values from first 10 rows:`);
  rows.slice(0, 10).forEach((row, i) => {
    const sellerNumber = row['売主番号'];
    const propertyType = row[propertyTypeColumn];
    console.log(`  Row ${i + 1} (${sellerNumber}): ${propertyType === undefined ? 'undefined' : propertyType === null ? 'null' : `"${propertyType}"`}`);
  });

  // Check AA4801 specifically
  console.log(`\nChecking AA4801 specifically:`);
  const aa4801 = rows.find(row => row['売主番号'] === 'AA4801');
  if (aa4801) {
    console.log(`  Found AA4801`);
    console.log(`  Property Type: ${aa4801[propertyTypeColumn] === undefined ? 'undefined' : aa4801[propertyTypeColumn] === null ? 'null' : `"${aa4801[propertyTypeColumn]}"`}`);
  } else {
    console.log(`  AA4801 not found in spreadsheet`);
  }
}

checkPropertyTypeColumn().catch(console.error);
