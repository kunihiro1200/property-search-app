/**
 * スプレッドシートのシート一覧を表示するスクリプト
 * 
 * 使い方:
 * npx ts-node backend/list-spreadsheet-sheets.ts
 */

// 環境変数を最初に読み込み
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function listSheets() {
  console.log('[list-sheets] Starting...');
  
  try {
    const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    
    if (!spreadsheetId) {
      console.error('[list-sheets] GOOGLE_SHEETS_BUYER_SPREADSHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID not found');
      process.exit(1);
    }
    
    console.log(`[list-sheets] Spreadsheet ID: ${spreadsheetId}`);
    
    // Google Sheets クライアントを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'dummy', // ダミー（メタデータ取得には不要）
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
    
    await sheetsClient.authenticate();
    console.log('[list-sheets] Authentication successful');
    
    // スプレッドシートのメタデータを取得
    const metadata = await sheetsClient.getSpreadsheetMetadata();
    
    console.log('\n[list-sheets] Available sheets:');
    console.log('================================');
    
    metadata.sheets?.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties?.title}`);
    });
    
    console.log('================================\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('[list-sheets] Error:', error);
    process.exit(1);
  }
}

listSheets();
