/**
 * AA9313 ATBB Status Simple Check
 * 
 * データベースのAA9313の現在の状態を確認します（スプレッドシート確認なし）
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA9313Simple() {
  console.log('🔍 AA9313 ATBB Status Simple Check\n');
  console.log('='.repeat(80));

  try {
    // property_listingsテーブルの現在の状態を確認
    console.log('\n📊 Checking AA9313 in property_listings table');
    console.log('-'.repeat(80));

    const { data: propertyListing, error: plError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, status, address, storage_location, updated_at')
      .eq('property_number', 'AA9313')
      .single();

    if (plError || !propertyListing) {
      console.log('❌ AA9313 not found in property_listings table');
      console.log(`   Error: ${plError?.message || 'Not found'}`);
      return;
    }

    console.log('✅ AA9313 found in property_listings table\n');
    console.log('Current database state:');
    console.log(`  property_number:   ${propertyListing.property_number}`);
    console.log(`  atbb_status:       "${propertyListing.atbb_status}"`);
    console.log(`  status:            "${propertyListing.status}"`);
    console.log(`  address:           "${propertyListing.address}"`);
    console.log(`  storage_location:  "${propertyListing.storage_location}"`);
    console.log(`  updated_at:        ${propertyListing.updated_at}`);

    // 問題の説明
    console.log('\n📊 Issue Summary');
    console.log('-'.repeat(80));
    console.log('\n⚠️  SYNC ISSUE:');
    console.log('  - AA9313のATBB状態がスプレッドシートで変更された');
    console.log('  - しかし、データベースには反映されていない');
    console.log('  - 原因: PropertyListingSyncServiceがUPDATEをサポートしていない');
    console.log('\n💡 SOLUTION:');
    console.log('  1. 即座の修正: fix-aa9313-atbb-status.ts を実行');
    console.log('  2. 恒久的な解決: PropertyListingSyncServiceにUPDATE機能を追加');

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Check complete\n');
}

// 実行
checkAA9313Simple()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
