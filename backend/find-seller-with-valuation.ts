import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

async function findSellerWithValuation() {
  console.log('=== Finding Sellers with Valuation Amounts ===\n');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const rows = await sheetsClient.readAll();
  
  console.log('Looking for sellers with valuation amounts...\n');
  
  let foundCount = 0;
  for (const row of rows) {
    const sellerNumber = row['売主番号'];
    const autoVal1 = row['査定額1（自動計算）v'];
    const autoVal2 = row['査定額2（自動計算）v'];
    const autoVal3 = row['査定額3（自動計算）v'];
    const manualVal1 = row['査定額1'];
    const manualVal2 = row['査定額2'];
    const manualVal3 = row['査定額3'];
    
    const hasAutoValuation = autoVal1 || autoVal2 || autoVal3;
    const hasManualValuation = manualVal1 || manualVal2 || manualVal3;
    
    if (hasAutoValuation || hasManualValuation) {
      console.log(`Seller: ${sellerNumber}`);
      console.log('  Auto Valuations:', autoVal1, autoVal2, autoVal3);
      console.log('  Manual Valuations:', manualVal1, manualVal2, manualVal3);
      console.log('');
      
      foundCount++;
      if (foundCount >= 5) {
        break;
      }
    }
  }
  
  console.log(`Found ${foundCount} sellers with valuation amounts`);
}

findSellerWithValuation()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
