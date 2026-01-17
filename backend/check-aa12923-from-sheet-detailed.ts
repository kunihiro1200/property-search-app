import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkAA12923FromSheet() {
  console.log('🔍 Checking AA12923 data from spreadsheet...\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  const aa12923Row = rows.find(row => row['売主番号'] === 'AA12923');

  if (!aa12923Row) {
    console.error('❌ AA12923 not found in spreadsheet');
    return;
  }

  console.log('📊 Data from spreadsheet:');
  console.log('  売主番号:', aa12923Row['売主番号']);
  console.log('  名前(漢字のみ）:', aa12923Row['名前(漢字のみ）']);
  console.log('  依頼者住所(物件所在と異なる場合）:', aa12923Row['依頼者住所(物件所在と異なる場合）']);
  console.log('  電話番号\\nハイフン不要:', aa12923Row['電話番号\nハイフン不要']);
  console.log('  メールアドレス:', aa12923Row['メールアドレス']);
  console.log('  査定額1:', aa12923Row['査定額1']);
  console.log('  査定額2:', aa12923Row['査定額2']);
  console.log('  査定額3:', aa12923Row['査定額3']);
  const comment = aa12923Row['コメント'];
  console.log('  コメント:', typeof comment === 'string' ? comment.substring(0, 100) + '...' : comment);
  console.log('  状況（当社）:', aa12923Row['状況（当社）']);
  
  console.log('\n📋 All column names in spreadsheet:');
  console.log(Object.keys(aa12923Row));
}

checkAA12923FromSheet().catch(console.error);
