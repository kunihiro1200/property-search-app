/**
 * AA9313 ATBB Status Fix (Version 2)
 * 
 * Uses the new PropertyListingSyncService UPDATE functionality
 * to sync AA9313 from spreadsheet to database.
 * 
 * This is the recommended approach going forward.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Property Listings Spreadsheet Configuration
const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function fixAA9313() {
  console.log('🔧 AA9313 ATBB Status Fix (v2)\n');
  console.log('='.repeat(80));

  try {
    // 1. Check current state
    console.log('\n📊 Step 1: Check current database state');
    console.log('-'.repeat(80));

    const { data: currentData, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, storage_location, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (fetchError || !currentData) {
      console.log('❌ AA9313 not found in database');
      return;
    }

    console.log('✅ AA9313 found in database');
    console.log(`\nCurrent state:`);
    console.log(`  atbb_status: "${currentData.atbb_status}"`);
    console.log(`  status: "${currentData.status}"`);
    console.log(`  storage_location: "${currentData.storage_location}"`);
    console.log(`  updated_at: ${currentData.updated_at}`);

    // 2. Initialize sync service
    console.log('\n📊 Step 2: Initialize sync service');
    console.log('-'.repeat(80));

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const syncService = new PropertyListingSyncService(sheetsClient);
    console.log('✅ Sync service initialized');

    // 3. Detect changes for AA9313
    console.log('\n📊 Step 3: Detect changes from spreadsheet');
    console.log('-'.repeat(80));

    const updates = await syncService.detectUpdatedPropertyListings();
    const aa9313Update = updates.find(u => u.property_number === 'AA9313');

    if (!aa9313Update) {
      console.log('✅ No changes detected - AA9313 is already synchronized');
      return;
    }

    console.log('⚠️  Changes detected:');
    for (const [field, change] of Object.entries(aa9313Update.changed_fields)) {
      console.log(`  ${field}: "${change.old}" → "${change.new}"`);
    }

    // 4. Apply update
    console.log('\n📊 Step 4: Apply update to database');
    console.log('-'.repeat(80));

    const result = await syncService.updatePropertyListing(
      'AA9313',
      aa9313Update.changed_fields
    );

    if (!result.success) {
      console.log('❌ Update failed:', result.error);
      throw new Error(result.error);
    }

    console.log('✅ Update successful');
    console.log(`  Fields updated: ${result.fields_updated?.join(', ')}`);

    // 5. Verify update
    console.log('\n📊 Step 5: Verify update');
    console.log('-'.repeat(80));

    const { data: verifyData, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, storage_location, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (verifyError || !verifyData) {
      console.log('❌ Verification failed');
      return;
    }

    console.log('✅ Verification successful');
    console.log(`\nUpdated state:`);
    console.log(`  atbb_status: "${verifyData.atbb_status}"`);
    console.log(`  status: "${verifyData.status}"`);
    console.log(`  storage_location: "${verifyData.storage_location}"`);
    console.log(`  updated_at: ${verifyData.updated_at}`);

    // 6. Confirm storage_location preserved
    if (verifyData.storage_location === currentData.storage_location) {
      console.log('\n✅ IMPORTANT: storage_location preserved (not overwritten)');
    } else {
      console.log('\n⚠️  WARNING: storage_location changed');
      console.log(`  Old: "${currentData.storage_location}"`);
      console.log(`  New: "${verifyData.storage_location}"`);
    }

    console.log('\n🎉 SUCCESS: AA9313 synchronized with spreadsheet');

  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    throw error;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Fix complete\n');
}

// Execute
fixAA9313()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
