import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkValuationAmountFormat() {
  console.log('🔍 Checking valuation amount format in spreadsheet...\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();
  
  // 査定額が入力されている売主を10件取得
  const sellersWithValuation = allRows
    .filter(row => row['査定額1（自動計算）v'] && row['査定額1（自動計算）v'] !== '')
    .slice(0, 10);

  console.log('📊 Sample valuation amounts from spreadsheet:\n');
  
  sellersWithValuation.forEach((row, index) => {
    console.log(`${index + 1}. ${row['売主番号']}:`);
    console.log(`   査定額1（自動計算）v: ${row['査定額1（自動計算）v']}`);
    console.log(`   査定額2（自動計算）v: ${row['査定額2（自動計算）v']}`);
    console.log(`   査定額3（自動計算）v: ${row['査定額3（自動計算）v']}`);
    console.log('');
  });

  console.log('\n💡 Analysis:');
  console.log('  If values are like "5580", "5930", "6280":');
  console.log('    → These are likely in 万円 (10,000 yen) units');
  console.log('    → 5580 = 55,800,000 yen');
  console.log('  If values are like "55800000", "59300000", "62800000":');
  console.log('    → These are already in yen units');
  console.log('    → No conversion needed');
}

checkValuationAmountFormat().catch(console.error);
