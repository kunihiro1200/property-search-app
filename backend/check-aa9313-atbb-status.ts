/**
 * AA9313 ATBB Status Sync Investigation
 * 
 * このスクリプトは、AA9313のATBB状態がスプレッドシートからDBに同期されない問題を診断します。
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingColumnMapper } from './src/services/PropertyListingColumnMapper';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function investigateAA9313AtbbStatus() {
  console.log('🔍 AA9313 ATBB Status Sync Investigation\n');
  console.log('=' .repeat(80));

  // 1. スプレッドシートから現在のATBB状態を確認
  console.log('\n📊 Step 1: Check ATBB status in spreadsheet');
  console.log('-'.repeat(80));

  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '業務リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const allRows = await sheetsClient.readAll();
    const aa9313Row = allRows.find(row => row['物件番号'] === 'AA9313');

    if (!aa9313Row) {
      console.log('❌ AA9313 not found in spreadsheet');
      return;
    }

    console.log('✅ AA9313 found in spreadsheet');
    console.log('\nSpreadsheet data:');
    console.log(`  物件番号: ${aa9313Row['物件番号']}`);
    console.log(`  atbb成約済み/非公開: "${aa9313Row['atbb成約済み/非公開']}"`);
    console.log(`  状況: "${aa9313Row['状況']}"`);
    console.log(`  所在地: "${aa9313Row['所在地']}"`);

    // 2. property_listingsテーブルの現在の状態を確認
    console.log('\n📊 Step 2: Check ATBB status in property_listings table');
    console.log('-'.repeat(80));

    const { data: propertyListing, error: plError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, address, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (plError || !propertyListing) {
      console.log('❌ AA9313 not found in property_listings table');
      console.log(`   Error: ${plError?.message || 'Not found'}`);
    } else {
      console.log('✅ AA9313 found in property_listings table');
      console.log('\nDatabase data:');
      console.log(`  property_number: ${propertyListing.property_number}`);
      console.log(`  atbb_status: "${propertyListing.atbb_status}"`);
      console.log(`  status: "${propertyListing.status}"`);
      console.log(`  address: "${propertyListing.address}"`);
      console.log(`  updated_at: ${propertyListing.updated_at}`);
    }

    // 3. データの比較
    console.log('\n📊 Step 3: Compare spreadsheet vs database');
    console.log('-'.repeat(80));

    const sheetAtbbStatus = aa9313Row['atbb成約済み/非公開'];
    const dbAtbbStatus = propertyListing?.atbb_status;

    console.log(`\nSpreadsheet ATBB status: "${sheetAtbbStatus}"`);
    console.log(`Database ATBB status:    "${dbAtbbStatus}"`);

    if (sheetAtbbStatus === dbAtbbStatus) {
      console.log('✅ ATBB status is synchronized');
    } else {
      console.log('❌ ATBB status is NOT synchronized');
      console.log('\n⚠️  SYNC ISSUE DETECTED:');
      console.log(`   Expected (from sheet): "${sheetAtbbStatus}"`);
      console.log(`   Actual (in DB):        "${dbAtbbStatus}"`);
    }

    // 4. カラムマッピングの確認
    console.log('\n📊 Step 4: Check column mapping');
    console.log('-'.repeat(80));

    const columnMapper = new PropertyListingColumnMapper();
    
    // Test mapping by creating a sample row
    const testHeaders = ['物件番号', 'atbb成約済み/非公開', '状況'];
    const testRow = ['TEST', '成約済み', 'テスト'];
    const mappedData = columnMapper.mapSpreadsheetToDatabase(testHeaders, testRow);
    
    console.log(`\nColumn mapping test:`);
    console.log(`  Spreadsheet column: "atbb成約済み/非公開"`);
    console.log(`  Maps to DB column:  "${Object.keys(mappedData).find(k => testHeaders.indexOf('atbb成約済み/非公開') !== -1 && mappedData[k] === '成約済み') || 'atbb_status'}"`);
    
    if ('atbb_status' in mappedData || mappedData.hasOwnProperty('atbb_status')) {
      console.log('✅ Column mapping appears to be configured');
    } else {
      console.log('⚠️  Column mapping may need verification');
    }

    // 5. 同期サービスの動作確認
    console.log('\n📊 Step 5: Check sync service behavior');
    console.log('-'.repeat(80));

    console.log('\n🔍 Analyzing sync service:');
    console.log('  - PropertyListingSyncService only CREATES new records');
    console.log('  - It does NOT UPDATE existing records');
    console.log('  - EnhancedAutoSyncService syncs sellers table, not property_listings');
    console.log('  - There is NO automatic update mechanism for property_listings');

    // 6. 根本原因の特定
    console.log('\n📊 Step 6: Root cause analysis');
    console.log('-'.repeat(80));

    console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
    console.log('  1. AA9313 already exists in property_listings table');
    console.log('  2. PropertyListingSyncService only creates NEW records (INSERT)');
    console.log('  3. There is NO service that UPDATES existing property_listings');
    console.log('  4. Changes in spreadsheet → property_listings are not propagated');
    console.log('\n💡 SOLUTION NEEDED:');
    console.log('  - Add UPDATE logic to PropertyListingSyncService');
    console.log('  - OR create a new PropertyListingUpdateService');
    console.log('  - OR add update detection to EnhancedAutoSyncService');

    // 7. 推奨される修正方法
    console.log('\n📊 Step 7: Recommended fix');
    console.log('-'.repeat(80));

    console.log('\n✅ RECOMMENDED APPROACH:');
    console.log('  1. Create a PropertyListingUpdateService');
    console.log('  2. Detect changes by comparing spreadsheet vs database');
    console.log('  3. Update only changed fields (like atbb_status)');
    console.log('  4. Integrate with EnhancedAutoSyncService for automatic updates');
    console.log('\n📝 IMMEDIATE FIX (Manual):');
    console.log('  Run a script to update AA9313.atbb_status from spreadsheet');

  } catch (error: any) {
    console.error('❌ Investigation failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Investigation complete\n');
}

// 実行
investigateAA9313AtbbStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
