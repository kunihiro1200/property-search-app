import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkAA13423FromSheet() {
  console.log('📊 スプレッドシートからAA13423のデータを確認\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  const targetRow = rows.find(row => row['売主番号'] === 'AA13423');
  
  if (!targetRow) {
    console.error('❌ スプレッドシートにAA13423が見つかりません');
    return;
  }

  console.log('✅ スプレッドシートのデータ:');
  console.log(`   売主番号: ${targetRow['売主番号']}`);
  console.log(`   反響年: ${targetRow['反響年'] || '(空)'}`);
  console.log(`   反響日: ${targetRow['反響日'] || '(空)'}`);
  console.log(`   サイト: ${targetRow['サイト'] || '(空)'}`);
  console.log(`   物件番号: ${targetRow['物件番号'] || '(空)'}`);
  console.log('');

  // すべてのカラム名を表示
  console.log('📋 利用可能なカラム名:');
  const columnNames = Object.keys(targetRow);
  columnNames.forEach((name, index) => {
    if (name.includes('反響') || name.includes('日') || name.includes('物件')) {
      console.log(`   ${index + 1}. "${name}": ${targetRow[name] || '(空)'}`);
    }
  });
}

checkAA13423FromSheet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
