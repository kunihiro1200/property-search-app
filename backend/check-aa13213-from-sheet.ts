import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAA13213FromSheet() {
  console.log('=== Checking AA13213 from Spreadsheet ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  
  const aa13213Row = rows.find(row => row['売主番号'] === 'AA13213');
  
  if (!aa13213Row) {
    console.log('AA13213 not found in spreadsheet');
    return;
  }

  console.log('AA13213 Data from Spreadsheet:');
  console.log('- 売主番号:', aa13213Row['売主番号']);
  console.log('- 名前(漢字のみ）:', aa13213Row['名前(漢字のみ）']);
  console.log('\n物件情報:');
  console.log('- 物件所在地:', aa13213Row['物件所在地']);
  console.log('- 物件種別:', aa13213Row['物件種別']);
  console.log('- 土（㎡）:', aa13213Row['土（㎡）']);
  console.log('- 建（㎡）:', aa13213Row['建（㎡）']);
  console.log('- 築年:', aa13213Row['築年']);
  console.log('- 間取り:', aa13213Row['間取り']);
  console.log('- 構造:', aa13213Row['構造']);
  console.log('- 状況（売主）:', aa13213Row['状況（売主）']);
  
  console.log('\n査定額:');
  console.log('- 査定額1（自動計算）v:', aa13213Row['査定額1（自動計算）v']);
  console.log('- 査定額2（自動計算）v:', aa13213Row['査定額2（自動計算）v']);
  console.log('- 査定額3（自動計算）v:', aa13213Row['査定額3（自動計算）v']);
  console.log('- 査定額1:', aa13213Row['査定額1']);
  console.log('- 査定額2:', aa13213Row['査定額2']);
  console.log('- 査定額3:', aa13213Row['査定額3']);
}

checkAA13213FromSheet()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
