// スプレッドシートから全物件データをproperty_listingsテーブルに同期するスクリプト
import dotenv from 'dotenv';
import { PropertyListingSyncService } from '../services/PropertyListingSyncService';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

dotenv.config();

async function syncAllProperties() {
  console.log('🚀 Starting property sync from Google Sheets...\n');
  
  // GoogleSheetsClientを初期化
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  // 認証
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets authenticated\n');
  
  const syncService = new PropertyListingSyncService(sheetsClient);
  
  try {
    console.log('📊 Step 1: Syncing new properties from spreadsheet...');
    const newPropertiesResult = await syncService.syncNewProperties();
    console.log(`✅ Added ${newPropertiesResult.added} new properties`);
    console.log(`⏭️ Skipped ${newPropertiesResult.skipped} existing properties\n`);
    
    console.log('📊 Step 2: Syncing updates to existing properties...');
    const updatesResult = await syncService.syncUpdatedPropertyListings();
    console.log(`✅ Updated ${updatesResult.updated} properties`);
    console.log(`❌ Failed ${updatesResult.failed} properties\n`);
    
    console.log('\n🎉 Sync complete!');
    console.log(`📊 Total: ${newPropertiesResult.total} properties in spreadsheet`);
    console.log(`✅ Added: ${newPropertiesResult.added} new properties`);
    console.log(`✅ Updated: ${updatesResult.updated} existing properties`);
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('📋 Error details:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

syncAllProperties();
