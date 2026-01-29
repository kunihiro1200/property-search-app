import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findCC105() {
  console.log('🔍 Finding CC105 in property list spreadsheet...\n');

  const config = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: './google-service-account.json',
  };

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  console.log('📋 Reading all rows...');
  const allRows = await client.readAll();
  console.log(`📊 Total rows: ${allRows.length}\n`);

  // CC105を検索
  let foundIndex = -1;
  for (let i = 0; i < allRows.length; i++) {
    const propertyNumber = allRows[i]['物件番号'];
    if (propertyNumber === 'CC105') {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex === -1) {
    console.log('❌ CC105 not found in spreadsheet');
    return;
  }

  console.log(`✅ Found CC105 at row ${foundIndex + 2} (index ${foundIndex})`);
  console.log('');

  // 最後の100行に含まれているか確認
  const last100StartIndex = allRows.length - 100;
  if (foundIndex >= last100StartIndex) {
    console.log(`✅ CC105 is in the last 100 rows (starts at index ${last100StartIndex})`);
  } else {
    console.log(`❌ CC105 is NOT in the last 100 rows (starts at index ${last100StartIndex})`);
    console.log(`   CC105 is at index ${foundIndex}, which is ${last100StartIndex - foundIndex} rows before the last 100`);
  }

  console.log('');
  console.log('📋 CC105 data:');
  const cc105 = allRows[foundIndex];
  console.log(`   物件番号: ${cc105['物件番号']}`);
  console.log(`   atbb_status: ${cc105['atbb成約済み/非公開']}`);
  console.log(`   所在地: ${cc105['所在地']}`);
}

findCC105().catch(console.error);
