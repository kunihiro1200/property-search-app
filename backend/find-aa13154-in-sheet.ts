import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function findAA13154InSheet() {
  console.log('🔍 Searching for AA13154 in spreadsheet...\n');

  // Initialize Google Sheets client
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
    sheetName: '業務依頼',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 
      '/C:/Users/kunih/Downloads/seller-management-personal-618a08796d49.json'
  });

  await sheetsClient.authenticate();
  console.log('✅ Authenticated with Google Sheets\n');

  // Find the row with AA13154 in the property number column
  console.log('📋 Searching for AA13154 in "物件No" column...');
  
  const rowIndex = await sheetsClient.findRowByColumn('物件No', 'AA13154');
  
  if (!rowIndex) {
    console.log('❌ AA13154 not found in spreadsheet');
    return;
  }

  console.log(`✅ Found AA13154 at row ${rowIndex}\n`);

  // Read the entire row to see all data
  console.log('📋 Reading entire row data...');
  const range = `A${rowIndex}:CZ${rowIndex}`;
  const data = await sheetsClient.readRange(range);
  
  if (!data || data.length === 0) {
    console.log('❌ Failed to read row data');
    return;
  }

  const row = data[0];
  
  // Display key fields
  console.log('\n📦 Key Fields:');
  console.log(`  物件No: ${row['物件No'] || 'NULL'}`);
  console.log(`  売主No: ${row['売主No'] || 'NULL'}`);
  console.log(`  保存場所: ${row['保存場所'] || 'NULL'}`);
  console.log(`  サイト: ${row['サイト'] || 'NULL'}`);
  
  // Check if there's a storage location value
  const storageLocation = row['保存場所'];
  
  console.log('\n═══════════════════════════════════════');
  if (storageLocation) {
    console.log(`✅ Storage location found: ${storageLocation}`);
    console.log(`\n💡 Next step: Run the update script to sync this value to the database`);
  } else {
    console.log('⚠️  No storage location found in spreadsheet');
    console.log(`   The "保存場所" column is empty for AA13154`);
  }
  console.log('═══════════════════════════════════════\n');
}

findAA13154InSheet().catch(console.error);
