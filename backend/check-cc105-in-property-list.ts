import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// .envファイルを読み込む
dotenv.config();

async function checkCC105InPropertyList() {
  console.log('🔍 Checking CC105 in property list spreadsheet...\n');

  const propertyListSpreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
  const propertyListSheetName = process.env.PROPERTY_LISTING_SHEET_NAME || '物件';

  console.log(`📋 Reading from spreadsheet: ${propertyListSpreadsheetId}`);
  console.log(`📄 Sheet name: ${propertyListSheetName}\n`);

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: propertyListSpreadsheetId!,
    sheetName: propertyListSheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  });

  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();

  console.log(`📊 Total rows: ${rows.length}\n`);

  // ヘッダーを表示
  if (rows.length > 0) {
    console.log('📋 Headers:', Object.keys(rows[0]));
    console.log('');
  }

  // CC105を検索
  console.log('🔍 Searching for CC105...\n');

  const cc105Row = rows.find(row => {
    const propertyNumber = row['物件番号'] || row['property_number'] || '';
    return propertyNumber === 'CC105';
  });

  if (cc105Row) {
    console.log('✅ Found CC105\n');
    console.log('📋 Row data:');
    Object.entries(cc105Row).forEach(([key, value]) => {
      if (value) {
        console.log(`   ${key}: ${value}`);
      }
    });
  } else {
    console.log('❌ CC105 not found in property list spreadsheet');
    console.log('');
    console.log('📝 This means:');
    console.log('   1. CC105 has not been added to the property list spreadsheet yet');
    console.log('   2. The sync service cannot sync CC105 until it is added');
    console.log('   3. You need to add CC105 to the property list spreadsheet manually');
  }
}

checkCC105InPropertyList().catch(console.error);
