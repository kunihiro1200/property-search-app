/**
 * Property Listing Update Sync - Manual Script
 * 
 * Manually trigger property listing update sync from spreadsheet to database.
 * Detects and applies changes to existing property listings.
 * 
 * Usage:
 *   npx ts-node sync-property-listings-updates.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// Property Listings Spreadsheet Configuration
const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function syncPropertyListingUpdates() {
  console.log('🔄 Property Listing Update Sync\n');
  console.log('='.repeat(80));

  try {
    // 1. Initialize Google Sheets Client
    console.log('\n📊 Step 1: Initialize Google Sheets Client');
    console.log('-'.repeat(80));

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    console.log(`Spreadsheet ID: ${PROPERTY_LIST_SPREADSHEET_ID}`);
    console.log(`Sheet Name: ${PROPERTY_LIST_SHEET_NAME}`);

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    console.log('✅ Google Sheets Client initialized');

    // 2. Initialize Sync Service
    console.log('\n📊 Step 2: Initialize Sync Service');
    console.log('-'.repeat(80));

    const syncService = new PropertyListingSyncService(sheetsClient);
    console.log('✅ Sync Service initialized');

    // 3. Run Update Sync
    console.log('\n📊 Step 3: Sync Property Listing Updates');
    console.log('-'.repeat(80));

    const result = await syncService.syncUpdatedPropertyListings();

    // 4. Display Results
    console.log('\n📊 Step 4: Sync Results');
    console.log('-'.repeat(80));

    if (result.total === 0) {
      console.log('✅ No updates needed - all properties are synchronized');
    } else {
      console.log(`\n📈 Summary:`);
      console.log(`  Total properties checked: ${result.total}`);
      console.log(`  Successfully updated: ${result.updated}`);
      console.log(`  Failed: ${result.failed}`);
      console.log(`  Duration: ${(result.duration_ms / 1000).toFixed(2)}s`);

      if (result.failed > 0 && result.errors) {
        console.log(`\n❌ Failed Updates:`);
        result.errors.forEach(err => {
          console.log(`  - ${err.property_number}: ${err.error}`);
        });
      }

      if (result.updated > 0) {
        console.log('\n✅ Property listings successfully synchronized with spreadsheet');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error.stack);
    throw error;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Sync complete\n');
}

// Execute
syncPropertyListingUpdates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
