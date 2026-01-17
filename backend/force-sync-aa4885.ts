import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function forceSyncAA4885() {
  console.log('=== AA4885 手動同期実行 ===\n');
  
  const propertyNumber = 'AA4885';
  
  try {
    // PropertyListingSyncServiceを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    console.log(`🔄 ${propertyNumber}の同期を開始します...`);
    
    // 特定の物件を同期
    const result = await syncService.syncSpecificProperty(propertyNumber);
    
    if (result.success) {
      console.log(`✅ ${propertyNumber}の同期が完了しました`);
      console.log(`   更新されたフィールド: ${result.updatedFields?.join(', ')}`);
    } else {
      console.log(`❌ ${propertyNumber}の同期に失敗しました`);
      console.log(`   エラー: ${result.error}`);
    }
    
  } catch (error: any) {
    console.error('❌ 同期処理中にエラーが発生しました:', error.message);
  }
}

forceSyncAA4885().catch(console.error);
