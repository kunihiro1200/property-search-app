import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function getAA12923FromSheet() {
  console.log('🔍 Fetching AA12923 from Google Sheets...\n');

  const sheetsClient = new GoogleSheetsClient();
  
  try {
    // Get all data from the sheet
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';
    
    console.log('📊 Spreadsheet ID:', spreadsheetId);
    console.log('📄 Sheet Name:', sheetName);
    
    const data = await sheetsClient.getSheetData(spreadsheetId, sheetName);
    
    if (!data || data.length === 0) {
      console.log('❌ No data found in sheet');
      return;
    }
    
    console.log(`✅ Retrieved ${data.length} rows from sheet\n`);
    
    // Find AA12923
    const headers = data[0];
    console.log('📋 Headers:', headers.slice(0, 10).join(', '), '...');
    
    // Find seller number column
    const sellerNumberIndex = headers.findIndex((h: string) => 
      h && (h.includes('売主番号') || h.includes('番号'))
    );
    
    if (sellerNumberIndex === -1) {
      console.log('❌ Could not find seller number column');
      console.log('Available headers:', headers);
      return;
    }
    
    console.log(`✅ Seller number column found at index ${sellerNumberIndex}: "${headers[sellerNumberIndex]}"\n`);
    
    // Search for AA12923
    const aa12923Row = data.find((row: any[]) => {
      const sellerNumber = row[sellerNumberIndex];
      return sellerNumber && sellerNumber.toString().includes('12923');
    });
    
    if (!aa12923Row) {
      console.log('❌ AA12923 not found in spreadsheet');
      console.log('Sample seller numbers:', data.slice(1, 6).map((r: any[]) => r[sellerNumberIndex]));
      return;
    }
    
    console.log('✅ Found AA12923 in spreadsheet!\n');
    console.log('📊 Complete Row Data:');
    
    headers.forEach((header: string, index: number) => {
      const value = aa12923Row[index];
      if (value) {
        console.log(`  ${header}: ${value}`);
      }
    });
    
    // Extract key fields
    console.log('\n🔑 Key Fields:');
    const nameIndex = headers.findIndex((h: string) => h && h.includes('名前'));
    const addressIndex = headers.findIndex((h: string) => h && h.includes('住所'));
    const phoneIndex = headers.findIndex((h: string) => h && h.includes('電話'));
    const emailIndex = headers.findIndex((h: string) => h && h.includes('メール'));
    
    console.log('  Seller Number:', aa12923Row[sellerNumberIndex]);
    console.log('  Name:', nameIndex >= 0 ? aa12923Row[nameIndex] : 'NOT FOUND');
    console.log('  Address:', addressIndex >= 0 ? aa12923Row[addressIndex] : 'NOT FOUND');
    console.log('  Phone:', phoneIndex >= 0 ? aa12923Row[phoneIndex] : 'NOT FOUND');
    console.log('  Email:', emailIndex >= 0 ? aa12923Row[emailIndex] : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getAA12923FromSheet().catch(console.error);
