import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkBBColumnHeader() {
  console.log('🔍 Checking BB column header in property spreadsheet...\n');

  try {
    const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const PROPERTY_LIST_SHEET_NAME = '物件';

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // ヘッダー行を取得（1行目）
    const data = await sheetsClient.readAll();
    
    if (!data || data.length === 0) {
      console.log('❌ No data found');
      return;
    }

    const headers = Object.keys(data[0]);
    console.log(`📋 Found ${headers.length} headers\n`);
    
    // BB列に関連するヘッダーを検索
    const petRelatedHeaders = headers.filter(h => 
      h.includes('ペット') || h.includes('pet') || h.includes('Pet')
    );
    
    console.log('🐾 Pet-related headers:');
    if (petRelatedHeaders.length > 0) {
      petRelatedHeaders.forEach(h => {
        console.log(`  - "${h}"`);
      });
    } else {
      console.log('  (none found)');
    }
    
    // 全てのヘッダーを表示（50-60番目あたり）
    console.log('\n📋 Headers around index 50-60:');
    headers.slice(50, 60).forEach((h, i) => {
      console.log(`  [${50 + i}] "${h}"`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

checkBBColumnHeader();
