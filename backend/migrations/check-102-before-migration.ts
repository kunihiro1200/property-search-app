/**
 * Pre-Migration Check: 102_cleanup_buyer_field_values.sql
 * Purpose: マイグレーション実行前に影響を受けるレコード数を確認
 * Date: 2026-02-06
 */

import { createClient } from '@supabase/supabase-js';
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

async function checkBeforeMigration() {
  console.log('🔍 Pre-Migration Check: 102_cleanup_buyer_field_values.sql');
  console.log('📋 Purpose: マイグレーション実行前に影響を受けるレコード数を確認');
  console.log('');

  try {
    // 全買主レコード数を取得
    const { count: totalCount, error: totalError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ Failed to get total count:', totalError);
      process.exit(1);
    }

    console.log(`📊 Total buyers: ${totalCount} records`);
    console.log('');

    // inquiry_email_phoneの現在の値を確認
    console.log('=== inquiry_email_phone の現在の値 ===');
    const { data: inquiryData, error: inquiryError } = await supabase
      .from('buyers')
      .select('inquiry_email_phone');

    if (inquiryError) {
      console.error('❌ Failed to get inquiry_email_phone data:', inquiryError);
    } else {
      const 済Count = inquiryData?.filter(r => r.inquiry_email_phone === '済').length || 0;
      const 未Count = inquiryData?.filter(r => r.inquiry_email_phone === '未').length || 0;
      const 不通Count = inquiryData?.filter(r => r.inquiry_email_phone === '不通').length || 0;
      const nullCount = inquiryData?.filter(r => r.inquiry_email_phone === null).length || 0;
      const otherValues = inquiryData?.filter(r => 
        r.inquiry_email_phone !== null && 
        !['済', '未', '不通'].includes(r.inquiry_email_phone)
      ) || [];

      console.log(`✅ 済: ${済Count} records`);
      console.log(`✅ 未: ${未Count} records`);
      console.log(`✅ 不通: ${不通Count} records`);
      console.log(`✅ NULL: ${nullCount} records`);
      console.log(`⚠️  想定外の値: ${otherValues.length} records`);

      if (otherValues.length > 0) {
        console.log('');
        console.log('📝 想定外の値の詳細:');
        const uniqueValues = [...new Set(otherValues.map(r => r.inquiry_email_phone))];
        uniqueValues.forEach(value => {
          const count = otherValues.filter(r => r.inquiry_email_phone === value).length;
          console.log(`   - "${value}": ${count} records`);
        });
        console.log('');
        console.log(`🔄 これらの値は「済」に変換されます`);
      }
    }

    console.log('');

    // three_calls_confirmedの現在の値を確認
    console.log('=== three_calls_confirmed の現在の値 ===');
    const { data: threeCallsData, error: threeCallsError } = await supabase
      .from('buyers')
      .select('three_calls_confirmed');

    if (threeCallsError) {
      console.error('❌ Failed to get three_calls_confirmed data:', threeCallsError);
    } else {
      const 済Count = threeCallsData?.filter(r => r.three_calls_confirmed === '済').length || 0;
      const 未Count = threeCallsData?.filter(r => r.three_calls_confirmed === '未').length || 0;
      const nullCount = threeCallsData?.filter(r => r.three_calls_confirmed === null).length || 0;
      const otherValues = threeCallsData?.filter(r => 
        r.three_calls_confirmed !== null && 
        !['済', '未'].includes(r.three_calls_confirmed)
      ) || [];

      console.log(`✅ 済: ${済Count} records`);
      console.log(`✅ 未: ${未Count} records`);
      console.log(`✅ NULL: ${nullCount} records`);
      console.log(`⚠️  想定外の値: ${otherValues.length} records`);

      if (otherValues.length > 0) {
        console.log('');
        console.log('📝 想定外の値の詳細:');
        const uniqueValues = [...new Set(otherValues.map(r => r.three_calls_confirmed))];
        uniqueValues.forEach(value => {
          const count = otherValues.filter(r => r.three_calls_confirmed === value).length;
          console.log(`   - "${value}": ${count} records`);
        });
        console.log('');
        console.log(`🔄 これらの値は「済」に変換されます`);
      }
    }

    console.log('');
    console.log('✅ Pre-migration check completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. 上記の影響を受けるレコード数を確認してください');
    console.log('2. 問題がなければ、以下のコマンドでマイグレーションを実行してください:');
    console.log('   npx ts-node backend/migrations/run-102-migration.ts');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// チェックを実行
checkBeforeMigration();
