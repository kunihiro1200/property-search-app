/**
 * 新規物件を手動で同期
 * 
 * スプレッドシート「物件」シートにあってデータベースにない物件を追加
 */
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function main() {
  console.log('🆕 新規物件の同期を開始...\n');

  try {
    // Google Sheets接続
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // PropertyListingSyncServiceを初期化
    const syncService = new PropertyListingSyncService(sheetsClient);

    // 新規物件を同期
    const result = await syncService.syncNewProperties();

    console.log('\n📊 同期結果:');
    console.log(`   合計: ${result.total}件`);
    console.log(`   追加成功: ${result.added}件`);
    console.log(`   失敗: ${result.failed}件`);
    console.log(`   処理時間: ${(result.duration_ms / 1000).toFixed(2)}秒`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      result.errors.forEach(err => {
        console.log(`   - ${err.property_number}: ${err.error}`);
      });
    }

    if (result.added > 0) {
      console.log('\n✅ 新規物件の同期が完了しました');
      console.log('   ブラウザをリロードして確認してください');
    } else if (result.total === 0) {
      console.log('\n✅ すべての物件が同期済みです');
    }

  } catch (error: any) {
    console.error('\n❌ 同期エラー:', error.message);
    process.exit(1);
  }
}

main();
