// スプレッドシートからproperty_listingsテーブルへデータを同期するスクリプト
import dotenv from 'dotenv';
import { PropertyListingSyncService } from '../services/PropertyListingSyncService';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

dotenv.config();

async function syncPropertyListings() {
  console.log('🔄 スプレッドシートからproperty_listingsテーブルへの同期を開始...\n');

  // GoogleSheetsClientを初期化（物件リストスプレッドシートを使用）
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  // 認証
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');

  // PropertyListingSyncServiceを初期化
  const syncService = new PropertyListingSyncService(sheetsClient);

  // 同期実行
  const result = await syncService.syncUpdatedPropertyListings();

  console.log('\n📊 同期完了:');
  console.log(`  更新: ${result.updated}件`);
  console.log(`  失敗: ${result.failed}件`);
  console.log(`  所要時間: ${result.duration_ms}ms`);

  if (result.failed > 0 && result.errors) {
    console.log('\n❌ エラー詳細:');
    result.errors.forEach(err => {
      console.log(`  ${err.property_number}: ${err.error}`);
    });
  }

  process.exit(0);
}

syncPropertyListings().catch(error => {
  console.error('❌ 同期エラー:', error);
  process.exit(1);
});
