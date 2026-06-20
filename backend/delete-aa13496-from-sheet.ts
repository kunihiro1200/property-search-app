import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function deleteAA13496FromSheet() {
  console.log('🗑️  Deleting AA13496 from spreadsheet...\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  
  // 1. AA13496の行を検索
  console.log('🔍 Searching for AA13496 in spreadsheet...');
  const allRows = await sheetsClient.readAll();
  const rowIndex = allRows.findIndex(row => row['売主番号'] === 'AA13496');
  
  if (rowIndex === -1) {
    console.log('❌ AA13496 not found in spreadsheet');
    return;
  }
  
  console.log(`✅ Found AA13496 at row ${rowIndex + 2} (including header)`);
  
  // 2. 行を削除
  console.log('🗑️  Deleting row...');
  await sheetsClient.deleteRow(rowIndex);
  
  console.log('✅ AA13496 deleted from spreadsheet');
  
  // 3. 確認
  console.log('\n🔍 Verifying deletion...');
  const updatedRows = await sheetsClient.readAll();
  const stillExists = updatedRows.find(row => row['売主番号'] === 'AA13496');
  
  if (stillExists) {
    console.log('❌ AA13496 still exists in spreadsheet');
  } else {
    console.log('✅ Confirmed: AA13496 has been deleted from spreadsheet');
  }
}

deleteAA13496FromSheet().catch(console.error);
