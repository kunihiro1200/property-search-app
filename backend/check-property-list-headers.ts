import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkHeaders() {
  console.log('🔍 Checking property list spreadsheet headers...\n');

  const config = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: './google-service-account.json',
  };

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  const headers = await client.getHeaders();
  
  console.log('📋 Headers:');
  headers.forEach((header, index) => {
    const column = String.fromCharCode(65 + index); // A, B, C, ...
    console.log(`  ${column}列: ${header}`);
  });
  
  console.log('');
  console.log('🔍 Looking for "物件番号" column...');
  const propertyNumberIndex = headers.indexOf('物件番号');
  if (propertyNumberIndex !== -1) {
    const column = String.fromCharCode(65 + propertyNumberIndex);
    console.log(`✅ Found "物件番号" at column ${column} (index ${propertyNumberIndex})`);
  } else {
    console.log('❌ "物件番号" column not found');
  }
}

checkHeaders().catch(console.error);
