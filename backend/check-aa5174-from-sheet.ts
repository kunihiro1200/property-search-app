import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAA5174FromSheet() {
  console.log('=== Checking AA5174 from Spreadsheet ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  
  const aa5174Row = rows.find(row => row['売主番号'] === 'AA5174');
  
  if (!aa5174Row) {
    console.log('AA5174 not found in spreadsheet');
    return;
  }

  console.log('AA5174 Data from Spreadsheet:');
  console.log('- 売主番号:', aa5174Row['売主番号']);
  console.log('- 名前(漢字のみ）:', aa5174Row['名前(漢字のみ）']);
  console.log('- 状況（当社）:', aa5174Row['状況（当社）']);
  console.log('\n査定額（自動計算）:');
  console.log('- 査定額1（自動計算）v:', aa5174Row['査定額1（自動計算）v']);
  console.log('- 査定額2（自動計算）v:', aa5174Row['査定額2（自動計算）v']);
  console.log('- 査定額3（自動計算）v:', aa5174Row['査定額3（自動計算）v']);
  console.log('\n査定額（手入力）:');
  console.log('- 査定額1:', aa5174Row['査定額1']);
  console.log('- 査定額2:', aa5174Row['査定額2']);
  console.log('- 査定額3:', aa5174Row['査定額3']);
  console.log('\n物件情報:');
  console.log('- 物件所在地:', aa5174Row['物件所在地']);
  console.log('- 土（㎡）:', aa5174Row['土（㎡）']);
  console.log('- 建（㎡）:', aa5174Row['建（㎡）']);
  console.log('- 築年:', aa5174Row['築年']);
  console.log('- 間取り:', aa5174Row['間取り']);
  console.log('- 構造:', aa5174Row['構造']);
}

checkAA5174FromSheet()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
