import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function debugReadRange() {
  console.log('=== readRangeのデバッグ ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    console.log('Google Sheets認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // E2:E10を取得
    console.log('E2:E10を取得中...');
    const rows = await sheetsClient.readRange('E2:E10');
    
    console.log(`✅ ${rows.length}行のデータを取得しました\n`);
    
    for (let i = 0; i < rows.length; i++) {
      console.log(`行${i + 2}:`, JSON.stringify(rows[i]));
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

debugReadRange().catch(console.error);
