import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkPropertyColumns() {
  console.log('=== Checking Property-Related Column Names ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  
  if (rows.length === 0) {
    console.log('No rows found');
    return;
  }

  const firstRow = rows[0];
  const allColumns = Object.keys(firstRow);
  
  console.log('All columns containing "物件" or "住所":');
  const propertyColumns = allColumns.filter(col => 
    col.includes('物件') || col.includes('住所')
  );
  propertyColumns.forEach(col => console.log(`- ${col}`));
  
  console.log('\nAll columns containing "土" or "建" or "築" or "間取" or "構造":');
  const buildingColumns = allColumns.filter(col => 
    col.includes('土') || col.includes('建') || col.includes('築') || 
    col.includes('間取') || col.includes('構造')
  );
  buildingColumns.forEach(col => console.log(`- ${col}`));
  
  console.log('\nAll columns containing "査定":');
  const valuationColumns = allColumns.filter(col => col.includes('査定'));
  valuationColumns.forEach(col => console.log(`- ${col}`));
}

checkPropertyColumns()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
