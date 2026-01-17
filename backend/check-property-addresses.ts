import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkPropertyAddresses() {
  console.log('🔍 物件住所の存在を確認中...\n');

  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    
    console.log(`✅ ${rows.length}行のデータを取得しました\n`);

    let withAddress = 0;
    let withoutAddress = 0;
    const samples: any[] = [];

    for (let i = 0; i < Math.min(rows.length, 100); i++) {
      const row = rows[i];
      const address = row['物件所在地'] || row['物件住所'];
      const sellerNumber = row['売主番号'];

      if (address) {
        withAddress++;
        if (samples.length < 5) {
          samples.push({ sellerNumber, address });
        }
      } else {
        withoutAddress++;
      }
    }

    console.log(`📊 最初の100件の統計:`);
    console.log(`  物件住所あり: ${withAddress}件`);
    console.log(`  物件住所なし: ${withoutAddress}件\n`);

    if (samples.length > 0) {
      console.log(`📋 サンプル（物件住所あり）:`);
      samples.forEach(s => {
        console.log(`  ${s.sellerNumber}: ${s.address}`);
      });
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

checkPropertyAddresses().catch(console.error);
