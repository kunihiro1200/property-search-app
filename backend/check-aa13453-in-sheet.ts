import { GoogleSheetsClient } from './api/src/services/GoogleSheetsClient';

async function checkAA13453InSheet() {
  console.log('🔍 Checking AA13453 in spreadsheet...\n');

  const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  const PROPERTY_LIST_SHEET_NAME = '物件';

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: './google-service-account.json',
    });

    console.log('🔐 Authenticating with Google Sheets...');
    await sheetsClient.authenticate();
    console.log('✅ Authenticated\n');

    console.log('📊 Reading all rows from spreadsheet...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ Found ${allRows.length} rows\n`);

    // AA13453を検索
    const aa13453Row = allRows.find((row: any) => row['物件番号'] === 'AA13453');

    if (aa13453Row) {
      console.log('✅ AA13453 FOUND in spreadsheet:');
      console.log('   物件番号:', aa13453Row['物件番号']);
      console.log('   住所:', aa13453Row['住所']);
      console.log('   価格:', aa13453Row['価格']);
      console.log('   atbb_status:', aa13453Row['atbb_status']);
      console.log('\n   Full row data:');
      console.log(JSON.stringify(aa13453Row, null, 2));
    } else {
      console.log('❌ AA13453 NOT FOUND in spreadsheet');
    }

    console.log('\n📊 Latest 10 property numbers in spreadsheet:');
    const propertyNumbers = allRows
      .map((row: any) => row['物件番号'])
      .filter((num: any) => num && typeof num === 'string' && num.startsWith('AA'))
      .slice(-10);
    
    propertyNumbers.forEach((num: string, i: number) => {
      console.log(`   ${i + 1}. ${num}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkAA13453InSheet();
