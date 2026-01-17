/**
 * 物件リストの強制同期スクリプト
 * 
 * 特定の物件番号について、スプレッドシートから最新データを取得し、
 * DBに強制的に同期します。
 */
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function forceSync(propertyNumber: string) {
  console.log(`🔄 強制同期開始: ${propertyNumber}\n`);

  try {
    // 1. スプレッドシートクライアントを初期化
    console.log('📊 Step 1: スプレッドシートに接続...');
    const sheetsConfig = {
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    console.log('✅ 接続完了\n');
    
    // 2. スプレッドシートから最新データを取得
    console.log('📊 Step 2: スプレッドシートから最新データを取得...');
    const allRows = await sheetsClient.readAll();
    const row = allRows.find(r => r['物件番号'] === propertyNumber);
    
    if (!row) {
      console.error(`❌ ${propertyNumber} がスプレッドシートに見つかりません`);
      return;
    }
    
    console.log('✅ データ取得完了\n');
    
    // 3. PropertyListingSyncServiceを初期化
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    // 4. データをマッピング
    console.log('📊 Step 3: データをマッピング...');
    const mappedData = (syncService as any).columnMapper.mapSpreadsheetToDatabase(row);
    console.log('✅ マッピング完了\n');
    
    console.log('📋 マッピングされたフィールド数:', Object.keys(mappedData).length);
    
    // 重要なフィールドを表示
    const importantFields = [
      'property_number',
      'property_type',
      'status',
      'atbb_status',
      'address',
      'sales_price',
      'storage_location',
    ];
    
    console.log('\n📋 更新されるフィールド（重要なもののみ）:');
    importantFields.forEach(field => {
      if (mappedData[field] !== undefined) {
        console.log(`  ${field}: "${mappedData[field]}"`);
      }
    });
    console.log();
    
    // 5. 確認プロンプト
    console.log('⚠️  この内容でDBを更新します。よろしいですか？');
    console.log('   続行するには Ctrl+C で中断してください（5秒後に自動実行）...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 6. DBを更新
    console.log('📊 Step 4: DBを更新...');
    const result = await syncService.updatePropertyListing(propertyNumber, mappedData);
    
    if (result.success) {
      console.log(`✅ ${propertyNumber} の同期が完了しました\n`);
      console.log('📋 更新されたフィールド:');
      result.fields_updated?.forEach(field => {
        console.log(`  - ${field}`);
      });
    } else {
      console.error(`❌ ${propertyNumber} の同期に失敗しました: ${result.error}`);
    }

  } catch (error: any) {
    console.error('❌ 強制同期エラー:', error.message);
    console.error(error.stack);
  }
}

// コマンドライン引数から物件番号を取得
const propertyNumber = process.argv[2];

if (!propertyNumber) {
  console.error('使用方法: npx ts-node force-sync-property.ts <物件番号>');
  console.error('例: npx ts-node force-sync-property.ts AA13129');
  process.exit(1);
}

forceSync(propertyNumber).catch(console.error);
