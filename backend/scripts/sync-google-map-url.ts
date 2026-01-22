// AA10424のGoogle Map URLをスプレッドシートから同期するスクリプト
import dotenv from 'dotenv';
import { PropertyListingSyncService } from '../src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from '../src/services/GoogleSheetsClient';

// 環境変数を読み込み
dotenv.config();

async function syncGoogleMapUrl() {
  console.log('🔄 Starting Google Map URL sync for AA10424...\n');

  try {
    // 1. GoogleSheetsClientを初期化して認証
    // 物件リストのスプレッドシートID（業務依頼のスプレッドシート）
    const sheetsConfig = {
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',  // 物件リストのシート名
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    // 2. PropertyListingSyncServiceを初期化
    const syncService = new PropertyListingSyncService(sheetsClient);

    // 3. スプレッドシートから全データを読み込み
    console.log('📊 Reading spreadsheet data...');
    const spreadsheetData = await sheetsClient.readAll();
    
    // 4. AA10424を検索
    const aa10424Row = spreadsheetData.find(row => {
      const propertyNumber = String(row['物件番号'] || '').trim();
      return propertyNumber === 'AA10424';
    });

    if (!aa10424Row) {
      console.error('❌ AA10424 not found in spreadsheet');
      process.exit(1);
    }

    console.log('✅ AA10424 found in spreadsheet');
    
    // 5. Google Map URLを確認
    const googleMapUrl = aa10424Row['GoogleMap'];
    console.log(`📍 Google Map URL: ${googleMapUrl || '(empty)'}`);

    if (!googleMapUrl) {
      console.error('❌ Google Map URL is empty in spreadsheet');
      process.exit(1);
    }

    // 6. 更新同期を実行（全物件）
    console.log('\n🔄 Running update sync...');
    const result = await syncService.syncUpdatedPropertyListings();

    console.log('\n📊 Sync Result:');
    console.log(`  Total: ${result.total}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Duration: ${result.duration_ms}ms`);

    if (result.failed > 0 && result.errors) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`  - ${err.property_number}: ${err.error}`);
      });
    }

    console.log('\n✅ Sync completed!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
syncGoogleMapUrl();
