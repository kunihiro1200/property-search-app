// 検出された更新を確認
import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';

config();

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function checkDetectedUpdates() {
  console.log('🔍 検出された更新を確認中...\n');
  console.log('='.repeat(80));
  
  try {
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    console.log('🔄 変更検出を実行中...');
    const updates = await syncService.detectUpdatedPropertyListings();
    
    console.log(`\n📊 検出された更新: ${updates.length}件\n`);
    
    if (updates.length === 0) {
      console.log('✅ 更新が必要な物件はありません');
      return;
    }
    
    // AA4885が含まれているか確認
    const aa4885Update = updates.find(u => u.property_number === 'AA4885');
    
    if (aa4885Update) {
      console.log('✅ AA4885が検出されました！\n');
      console.log('📋 変更されたフィールド:');
      for (const [field, change] of Object.entries(aa4885Update.changed_fields)) {
        console.log(`  ${field}:`);
        console.log(`    旧: ${change.old}`);
        console.log(`    新: ${change.new}`);
      }
    } else {
      console.log('❌ AA4885が検出されませんでした\n');
    }
    
    // 検出された物件のリスト
    console.log('\n📋 検出された物件:');
    console.log('-'.repeat(80));
    updates.forEach((update, index) => {
      const changedFieldsCount = Object.keys(update.changed_fields).length;
      console.log(`${index + 1}. ${update.property_number} (${changedFieldsCount}件の変更)`);
      
      // 最初の3件の変更を表示
      const fields = Object.keys(update.changed_fields).slice(0, 3);
      fields.forEach(field => {
        console.log(`   - ${field}`);
      });
      if (Object.keys(update.changed_fields).length > 3) {
        console.log(`   ... 他${Object.keys(update.changed_fields).length - 3}件`);
      }
    });
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

checkDetectedUpdates()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 確認エラー:', error);
    process.exit(1);
  });
