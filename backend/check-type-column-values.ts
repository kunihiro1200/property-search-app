import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkTypeColumnValues() {
  console.log('Checking "種別" column values...\n');
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  if (rows.length === 0) {
    console.log('No rows found');
    return;
  }

  const typeColumn = '種別';
  
  // Check if column exists
  console.log(`Column "${typeColumn}" exists: ${typeColumn in rows[0]}`);
  
  // Sample values
  console.log(`\nSample values from first 20 rows:`);
  rows.slice(0, 20).forEach((row) => {
    const sellerNumber = row['売主番号'];
    const typeValue = row[typeColumn];
    console.log(`  ${sellerNumber}: ${typeValue === undefined ? 'undefined' : typeValue === null ? 'null' : `"${typeValue}"`}`);
  });

  // Count unique values
  const valueCounts = new Map<string, number>();
  let nullCount = 0;
  let undefinedCount = 0;
  
  rows.forEach(row => {
    const value = row[typeColumn];
    if (value === undefined) {
      undefinedCount++;
    } else if (value === null || value === '') {
      nullCount++;
    } else {
      const strValue = String(value);
      valueCounts.set(strValue, (valueCounts.get(strValue) || 0) + 1);
    }
  });

  console.log(`\nValue distribution (total ${rows.length} rows):`);
  console.log(`  undefined: ${undefinedCount}`);
  console.log(`  null/empty: ${nullCount}`);
  console.log(`\nUnique values:`);
  Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([value, count]) => {
      console.log(`  "${value}": ${count} (${((count / rows.length) * 100).toFixed(1)}%)`);
    });

  // Check AA4801 specifically
  console.log(`\nChecking AA4801 specifically:`);
  const aa4801 = rows.find(row => row['売主番号'] === 'AA4801');
  if (aa4801) {
    console.log(`  Found AA4801`);
    console.log(`  種別: ${aa4801[typeColumn] === undefined ? 'undefined' : aa4801[typeColumn] === null ? 'null' : `"${aa4801[typeColumn]}"`}`);
  } else {
    console.log(`  AA4801 not found in spreadsheet`);
  }
}

checkTypeColumnValues().catch(console.error);
