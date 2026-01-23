import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkCronJobSetup() {
  console.log('🔍 Vercel Cron Job設定チェック\n');

  let allChecksPass = true;

  // 1. 環境変数のチェック
  console.log('📋 1. 環境変数のチェック');
  console.log('----------------------------');

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SHEETS_BUYER_SPREADSHEET_ID',
    'GOOGLE_SHEETS_BUYER_SHEET_NAME',
    'CRON_SECRET',
  ];

  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: 設定済み`);
    } else {
      console.log(`❌ ${envVar}: 未設定`);
      allChecksPass = false;
    }
  });

  console.log('');

  // 2. データベーススキーマのチェック
  console.log('📋 2. データベーススキーマのチェック');
  console.log('----------------------------');

  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // property_inquiriesテーブルの存在確認
    const { data: tableCheck, error: tableError } = await supabase
      .from('property_inquiries')
      .select('id')
      .limit(1);

    if (tableError) {
      console.log(`❌ property_inquiriesテーブル: 存在しない`);
      console.log(`   エラー: ${tableError.message}`);
      allChecksPass = false;
    } else {
      console.log(`✅ property_inquiriesテーブル: 存在する`);
    }

    // property_numberカラムの存在確認
    const { data: propertyNumberCheck, error: propertyNumberError } = await supabase
      .from('property_inquiries')
      .select('property_number')
      .limit(1);

    if (propertyNumberError) {
      console.log(`❌ property_numberカラム: 存在しない`);
      console.log(`   エラー: ${propertyNumberError.message}`);
      console.log(`   マイグレーションを実行してください:`);
      console.log(`   ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS property_number TEXT;`);
      allChecksPass = false;
    } else {
      console.log(`✅ property_numberカラム: 存在する`);
    }

    // buyer_numberカラムの存在確認
    const { data: buyerNumberCheck, error: buyerNumberError } = await supabase
      .from('property_inquiries')
      .select('buyer_number')
      .limit(1);

    if (buyerNumberError) {
      console.log(`❌ buyer_numberカラム: 存在しない`);
      console.log(`   エラー: ${buyerNumberError.message}`);
      console.log(`   マイグレーションを実行してください:`);
      console.log(`   ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS buyer_number INTEGER;`);
      allChecksPass = false;
    } else {
      console.log(`✅ buyer_numberカラム: 存在する`);
    }
  } catch (error: any) {
    console.log(`❌ データベース接続エラー: ${error.message}`);
    allChecksPass = false;
  }

  console.log('');

  // 3. Vercel設定のチェック（手動確認が必要）
  console.log('📋 3. Vercel設定のチェック（手動確認が必要）');
  console.log('----------------------------');
  console.log('以下をVercel Dashboardで確認してください:');
  console.log('');
  console.log('1. Vercel Dashboard → Settings → Environment Variables');
  console.log('   - CRON_SECRETが設定されているか確認');
  console.log('');
  console.log('2. Vercel Dashboard → Settings → Crons');
  console.log('   - /api/cron/sync-inquiriesが表示されているか確認');
  console.log('   - スケジュール: * * * * * (毎分実行)');
  console.log('');

  // 4. 最新の問合せ状態のチェック
  console.log('📋 4. 最新の問合せ状態のチェック');
  console.log('----------------------------');

  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: inquiries, error } = await supabase
      .from('property_inquiries')
      .select('id, name, sheet_sync_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log(`❌ 問合せ取得エラー: ${error.message}`);
    } else if (!inquiries || inquiries.length === 0) {
      console.log('ℹ️  問合せデータがありません');
    } else {
      console.log(`✅ 最新の問合せ ${inquiries.length} 件:\n`);

      inquiries.forEach((inquiry, index) => {
        const status =
          inquiry.sheet_sync_status === 'synced'
            ? '✅ 同期済み'
            : inquiry.sheet_sync_status === 'pending'
            ? '⏳ 同期待ち'
            : inquiry.sheet_sync_status === 'failed'
            ? '❌ 同期失敗'
            : '❓ 不明';

        console.log(`${index + 1}. ${inquiry.name} - ${status}`);
        console.log(`   作成日時: ${inquiry.created_at}`);
      });

      console.log('');

      // pending状態の問合せがある場合
      const pendingCount = inquiries.filter(
        (i) => i.sheet_sync_status === 'pending'
      ).length;

      if (pendingCount > 0) {
        console.log(`⏳ 同期待ちの問合せ: ${pendingCount} 件`);
        console.log('   Cron Jobが1分以内に同期します');
      }

      // failed状態の問合せがある場合
      const failedCount = inquiries.filter(
        (i) => i.sheet_sync_status === 'failed'
      ).length;

      if (failedCount > 0) {
        console.log(`❌ 同期失敗の問合せ: ${failedCount} 件`);
        console.log('   手動で再同期してください:');
        console.log('   npx ts-node retry-failed-inquiry-sync.ts');
        allChecksPass = false;
      }
    }
  } catch (error: any) {
    console.log(`❌ 問合せ取得エラー: ${error.message}`);
  }

  console.log('');
  console.log('========================================');

  if (allChecksPass) {
    console.log('✅ すべてのチェックが完了しました！');
    console.log('');
    console.log('次のステップ:');
    console.log('1. Vercel Dashboardで手動確認を実行');
    console.log('2. 問合せフォームから送信してテスト');
    console.log('3. 1分後にスプレッドシートを確認');
  } else {
    console.log('❌ 一部のチェックが失敗しました');
    console.log('');
    console.log('上記のエラーを修正してから再度実行してください');
  }

  console.log('========================================');
}

checkCronJobSetup();
