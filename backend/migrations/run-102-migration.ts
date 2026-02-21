/**
 * Migration Runner: 102_cleanup_buyer_field_values.sql
 * Purpose: 買主テーブルの想定外のフィールド値をクリーンアップ
 * Date: 2026-02-06
 * Related Spec: buyer-three-calls-confirmed-display-fix
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting migration: 102_cleanup_buyer_field_values.sql');
  console.log('📋 Purpose: 買主テーブルの想定外のフィールド値をクリーンアップ');
  console.log('');

  try {
    console.log('⚙️  Executing migration...');
    console.log('');

    // Step 1: inquiry_email_phoneの想定外の値を確認
    console.log('📊 Step 1: inquiry_email_phoneの想定外の値を確認...');
    const { data: inquiryBefore, error: inquiryBeforeError } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_email_phone')
      .not('inquiry_email_phone', 'is', null)
      .not('inquiry_email_phone', 'in', '("済","未","不通")');

    if (inquiryBeforeError) {
      console.error('❌ Failed to check inquiry_email_phone:', inquiryBeforeError);
      process.exit(1);
    }

    console.log(`   Found ${inquiryBefore?.length || 0} records with unexpected values`);
    if (inquiryBefore && inquiryBefore.length > 0) {
      console.log('   Values to be updated:');
      inquiryBefore.forEach(r => {
        console.log(`   - Buyer ${r.buyer_number}: "${r.inquiry_email_phone}" → "済"`);
      });
    }
    console.log('');

    // Step 2: three_calls_confirmedの想定外の値を確認
    console.log('📊 Step 2: three_calls_confirmedの想定外の値を確認...');
    const { data: threeCallsBefore, error: threeCallsBeforeError } = await supabase
      .from('buyers')
      .select('buyer_number, three_calls_confirmed')
      .not('three_calls_confirmed', 'is', null)
      .not('three_calls_confirmed', 'in', '("済","未")');

    if (threeCallsBeforeError) {
      console.error('❌ Failed to check three_calls_confirmed:', threeCallsBeforeError);
      process.exit(1);
    }

    console.log(`   Found ${threeCallsBefore?.length || 0} records with unexpected values`);
    if (threeCallsBefore && threeCallsBefore.length > 0) {
      console.log('   Values to be updated:');
      threeCallsBefore.forEach(r => {
        console.log(`   - Buyer ${r.buyer_number}: "${r.three_calls_confirmed}" → "済"`);
      });
    }
    console.log('');

    // Step 3: inquiry_email_phoneを更新
    if (inquiryBefore && inquiryBefore.length > 0) {
      console.log('🔄 Step 3: inquiry_email_phoneを更新中...');
      const buyerNumbers = inquiryBefore.map(r => r.buyer_number);
      const { error: inquiryUpdateError } = await supabase
        .from('buyers')
        .update({ inquiry_email_phone: '済' })
        .in('buyer_number', buyerNumbers);

      if (inquiryUpdateError) {
        console.error('❌ Failed to update inquiry_email_phone:', inquiryUpdateError);
        process.exit(1);
      }
      console.log(`   ✅ Updated ${inquiryBefore.length} records`);
    } else {
      console.log('✅ Step 3: inquiry_email_phoneは更新不要（想定外の値なし）');
    }
    console.log('');

    // Step 4: three_calls_confirmedを更新
    if (threeCallsBefore && threeCallsBefore.length > 0) {
      console.log('🔄 Step 4: three_calls_confirmedを更新中...');
      const buyerNumbers = threeCallsBefore.map(r => r.buyer_number);
      const { error: threeCallsUpdateError } = await supabase
        .from('buyers')
        .update({ three_calls_confirmed: '済' })
        .in('buyer_number', buyerNumbers);

      if (threeCallsUpdateError) {
        console.error('❌ Failed to update three_calls_confirmed:', threeCallsUpdateError);
        process.exit(1);
      }
      console.log(`   ✅ Updated ${threeCallsBefore.length} records`);
    } else {
      console.log('✅ Step 4: three_calls_confirmedは更新不要（想定外の値なし）');
    }
    console.log('');

    console.log('✅ Migration completed successfully!');
    console.log('');

    // 結果を確認
    console.log('🔍 Verifying results...');
    console.log('');

    // inquiry_email_phoneの集計
    const { data: inquiryData, error: inquiryError } = await supabase
      .from('buyers')
      .select('inquiry_email_phone', { count: 'exact', head: false });

    if (inquiryError) {
      console.error('❌ Failed to verify inquiry_email_phone:', inquiryError);
    } else {
      const 済Count = inquiryData?.filter(r => r.inquiry_email_phone === '済').length || 0;
      const 未Count = inquiryData?.filter(r => r.inquiry_email_phone === '未').length || 0;
      const 不通Count = inquiryData?.filter(r => r.inquiry_email_phone === '不通').length || 0;
      const nullCount = inquiryData?.filter(r => r.inquiry_email_phone === null).length || 0;
      const otherCount = inquiryData?.filter(r => 
        r.inquiry_email_phone !== null && 
        !['済', '未', '不通'].includes(r.inquiry_email_phone)
      ).length || 0;

      console.log('=== inquiry_email_phone 集計 ===');
      console.log(`済: ${済Count} records`);
      console.log(`未: ${未Count} records`);
      console.log(`不通: ${不通Count} records`);
      console.log(`NULL: ${nullCount} records`);
      console.log(`想定外の値: ${otherCount} records`);
      console.log('');
    }

    // three_calls_confirmedの集計
    const { data: threeCallsData, error: threeCallsError } = await supabase
      .from('buyers')
      .select('three_calls_confirmed', { count: 'exact', head: false });

    if (threeCallsError) {
      console.error('❌ Failed to verify three_calls_confirmed:', threeCallsError);
    } else {
      const 済Count = threeCallsData?.filter(r => r.three_calls_confirmed === '済').length || 0;
      const 未Count = threeCallsData?.filter(r => r.three_calls_confirmed === '未').length || 0;
      const nullCount = threeCallsData?.filter(r => r.three_calls_confirmed === null).length || 0;
      const otherCount = threeCallsData?.filter(r => 
        r.three_calls_confirmed !== null && 
        !['済', '未'].includes(r.three_calls_confirmed)
      ).length || 0;

      console.log('=== three_calls_confirmed 集計 ===');
      console.log(`済: ${済Count} records`);
      console.log(`未: ${未Count} records`);
      console.log(`NULL: ${nullCount} records`);
      console.log(`想定外の値: ${otherCount} records`);
      console.log('');
    }

    console.log('✅ Verification completed!');
    console.log('');
    console.log('📝 Summary:');
    console.log('- inquiry_email_phone: 想定外の値を「済」に変換しました');
    console.log('- three_calls_confirmed: 想定外の値を「済」に変換しました');
    console.log('');
    console.log('🎉 Migration 102 completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// マイグレーションを実行
runMigration();
