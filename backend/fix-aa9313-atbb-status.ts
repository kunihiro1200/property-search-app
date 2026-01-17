/**
 * AA9313 ATBB Status Quick Fix
 * 
 * スプレッドシートから最新のATBB状態を取得し、DBを更新します。
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA9313AtbbStatus() {
  console.log('🔧 AA9313 ATBB Status Quick Fix\n');
  console.log('=' .repeat(80));

  try {
    // 1. スプレッドシートから最新データを取得
    console.log('\n📊 Step 1: Fetch latest data from spreadsheet');
    console.log('-'.repeat(80));

    // 物件リストスプレッドシートの設定
    const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const PROPERTY_LIST_SHEET_NAME = '物件';

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    console.log(`Using spreadsheet: ${PROPERTY_LIST_SPREADSHEET_ID}`);
    console.log(`Using sheet: ${PROPERTY_LIST_SHEET_NAME}`);

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const allRows = await sheetsClient.readAll();
    const aa9313Row = allRows.find(row => row['物件番号'] === 'AA9313');

    if (!aa9313Row) {
      console.log('❌ AA9313 not found in spreadsheet');
      return;
    }

    const latestAtbbStatus = aa9313Row['atbb成約済み/非公開'];
    const latestStatus = aa9313Row['状況'];

    console.log('✅ AA9313 found in spreadsheet');
    console.log(`\nLatest data from spreadsheet:`);
    console.log(`  atbb成約済み/非公開: "${latestAtbbStatus}"`);
    console.log(`  状況: "${latestStatus}"`);

    // 2. 現在のDB状態を確認
    console.log('\n📊 Step 2: Check current database state');
    console.log('-'.repeat(80));

    const { data: currentData, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (fetchError || !currentData) {
      console.log('❌ AA9313 not found in database');
      console.log(`   Error: ${fetchError?.message || 'Not found'}`);
      return;
    }

    console.log('✅ AA9313 found in database');
    console.log(`\nCurrent database state:`);
    console.log(`  atbb_status: "${currentData.atbb_status}"`);
    console.log(`  status: "${currentData.status}"`);
    console.log(`  updated_at: ${currentData.updated_at}`);

    // 3. 変更が必要か確認
    console.log('\n📊 Step 3: Check if update is needed');
    console.log('-'.repeat(80));

    const needsUpdate = 
      currentData.atbb_status !== latestAtbbStatus ||
      currentData.status !== latestStatus;

    if (!needsUpdate) {
      console.log('✅ No update needed - data is already synchronized');
      return;
    }

    console.log('⚠️  Update needed:');
    if (currentData.atbb_status !== latestAtbbStatus) {
      console.log(`  atbb_status: "${currentData.atbb_status}" → "${latestAtbbStatus}"`);
    }
    if (currentData.status !== latestStatus) {
      console.log(`  status: "${currentData.status}" → "${latestStatus}"`);
    }

    // 4. DBを更新
    console.log('\n📊 Step 4: Update database');
    console.log('-'.repeat(80));

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (currentData.atbb_status !== latestAtbbStatus) {
      updateData.atbb_status = latestAtbbStatus;
    }
    if (currentData.status !== latestStatus) {
      updateData.status = latestStatus;
    }

    const { error: updateError } = await supabase
      .from('property_listings')
      .update(updateData)
      .eq('property_number', 'AA9313');

    if (updateError) {
      console.log('❌ Update failed:', updateError.message);
      throw updateError;
    }

    console.log('✅ Database updated successfully');
    console.log(`\nUpdated fields:`);
    Object.entries(updateData).forEach(([key, value]) => {
      if (key !== 'updated_at') {
        console.log(`  ${key}: "${value}"`);
      }
    });

    // 5. 更新後の状態を確認
    console.log('\n📊 Step 5: Verify update');
    console.log('-'.repeat(80));

    const { data: verifyData, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (verifyError || !verifyData) {
      console.log('❌ Verification failed');
      return;
    }

    console.log('✅ Verification successful');
    console.log(`\nUpdated database state:`);
    console.log(`  atbb_status: "${verifyData.atbb_status}"`);
    console.log(`  status: "${verifyData.status}"`);
    console.log(`  updated_at: ${verifyData.updated_at}`);

    // 6. 最終確認
    const isNowSynced = 
      verifyData.atbb_status === latestAtbbStatus &&
      verifyData.status === latestStatus;

    if (isNowSynced) {
      console.log('\n🎉 SUCCESS: AA9313 is now synchronized with spreadsheet');
    } else {
      console.log('\n⚠️  WARNING: Data may not be fully synchronized');
    }

  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    throw error;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Fix complete\n');
}

// 実行
fixAA9313AtbbStatus()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
