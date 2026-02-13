/**
 * 既存の買主データをスプレッドシートに同期するスクリプト
 * 
 * 使い方:
 * npx ts-node backend/sync-buyer-to-spreadsheet.ts <buyer_number>
 * 
 * 例:
 * npx ts-node backend/sync-buyer-to-spreadsheet.ts 6978
 */

// 環境変数を最初に読み込み（他のインポートより前）
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

// 環境変数が読み込まれたか確認
console.log('[sync-buyer-to-spreadsheet] Environment check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'loaded' : 'missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'loaded' : 'missing',
  GOOGLE_SHEETS_BUYER_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID ? 'loaded' : 'missing',
});

import { BuyerService } from './src/services/BuyerService';
import { BuyerWriteService } from './src/services/BuyerWriteService';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function syncBuyerToSpreadsheet(buyerNumber: string) {
  console.log(`[sync-buyer-to-spreadsheet] Starting sync for buyer ${buyerNumber}`);
  
  try {
    // BuyerServiceを初期化
    const buyerService = new BuyerService();
    
    // 買主データを取得
    console.log(`[sync-buyer-to-spreadsheet] Fetching buyer data from database...`);
    const buyer = await buyerService.getByBuyerNumber(buyerNumber, true); // includeDeleted: true
    
    if (!buyer) {
      console.error(`[sync-buyer-to-spreadsheet] Buyer ${buyerNumber} not found in database`);
      process.exit(1);
    }
    
    console.log(`[sync-buyer-to-spreadsheet] Found buyer:`, {
      buyer_number: buyer.buyer_number,
      name: buyer.name,
      phone_number: buyer.phone_number,
      email: buyer.email,
    });
    
    // Google Sheets クライアントを初期化
    console.log(`[sync-buyer-to-spreadsheet] Initializing Google Sheets client...`);
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
    
    await sheetsClient.authenticate();
    console.log(`[sync-buyer-to-spreadsheet] Google Sheets authentication successful`);
    
    // カラムマッパーを初期化
    const columnMapper = new BuyerColumnMapper();
    
    // BuyerWriteServiceを初期化
    const writeService = new BuyerWriteService(sheetsClient, columnMapper);
    
    // スプレッドシートに既に存在するか確認
    console.log(`[sync-buyer-to-spreadsheet] Checking if buyer exists in spreadsheet...`);
    const existingRow = await writeService.findRowByBuyerNumber(buyerNumber);
    
    if (existingRow) {
      console.log(`[sync-buyer-to-spreadsheet] Buyer ${buyerNumber} already exists in spreadsheet at row ${existingRow}`);
      console.log(`[sync-buyer-to-spreadsheet] Updating existing row...`);
      
      // データベースのフィールド名をスプレッドシートのカラム名にマッピング
      const mappedData: Record<string, any> = {};
      for (const [dbField, value] of Object.entries(buyer)) {
        const sheetColumn = columnMapper.getSpreadsheetColumnName(dbField);
        if (sheetColumn) {
          mappedData[sheetColumn] = value;
        }
      }
      
      // 既存行を更新
      const result = await writeService.updateFields(buyerNumber, buyer);
      
      if (result.success) {
        console.log(`[sync-buyer-to-spreadsheet] ✅ Successfully updated buyer ${buyerNumber} in spreadsheet at row ${result.rowNumber}`);
      } else {
        console.error(`[sync-buyer-to-spreadsheet] ❌ Failed to update buyer ${buyerNumber}:`, result.error);
        process.exit(1);
      }
    } else {
      console.log(`[sync-buyer-to-spreadsheet] Buyer ${buyerNumber} does not exist in spreadsheet`);
      console.log(`[sync-buyer-to-spreadsheet] Adding new row...`);
      
      // データベースのフィールド名をスプレッドシートのカラム名にマッピング
      const mappedData: Record<string, any> = {};
      for (const [dbField, value] of Object.entries(buyer)) {
        const sheetColumn = columnMapper.getSpreadsheetColumnName(dbField);
        if (sheetColumn) {
          mappedData[sheetColumn] = value;
        }
      }
      
      // 新規行を追加
      const result = await writeService.appendBuyerRow(mappedData);
      
      if (result.success) {
        console.log(`[sync-buyer-to-spreadsheet] ✅ Successfully added buyer ${buyerNumber} to spreadsheet`);
      } else {
        console.error(`[sync-buyer-to-spreadsheet] ❌ Failed to add buyer ${buyerNumber}:`, result.error);
        process.exit(1);
      }
    }
    
    console.log(`[sync-buyer-to-spreadsheet] Sync completed successfully`);
    process.exit(0);
  } catch (error: any) {
    console.error(`[sync-buyer-to-spreadsheet] Error:`, error);
    process.exit(1);
  }
}

// コマンドライン引数から買主番号を取得
const buyerNumber = process.argv[2];

if (!buyerNumber) {
  console.error('Usage: npx ts-node backend/sync-buyer-to-spreadsheet.ts <buyer_number>');
  console.error('Example: npx ts-node backend/sync-buyer-to-spreadsheet.ts 6978');
  process.exit(1);
}

syncBuyerToSpreadsheet(buyerNumber);
