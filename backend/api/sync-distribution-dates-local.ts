/**
 * distribution_date をスプレッドシートからDBに一括更新するローカル実行スクリプト
 * 
 * 実行方法:
 *   cd backend
 *   npx ts-node -e "require('dotenv').config(); require('ts-node').register();" api/sync-distribution-dates-local.ts
 * 
 * または:
 *   cd backend
 *   npx ts-node --project tsconfig.json -r dotenv/config api/sync-distribution-dates-local.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.env を読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function main() {
  console.log('🚀 distribution_date 一括更新スクリプト開始\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID!;
  const sheetName = process.env.PROPERTY_LISTING_SHEET_NAME || '物件';
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.resolve(__dirname, '../google-service-account.json');

  console.log('📋 設定確認:');
  console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ 未設定'}`);
  console.log(`  SUPABASE_SERVICE_KEY: ${supabaseKey ? '✅' : '❌ 未設定'}`);
  console.log(`  PROPERTY_LISTING_SPREADSHEET_ID: ${spreadsheetId || '❌ 未設定'}`);
  console.log(`  PROPERTY_LISTING_SHEET_NAME: ${sheetName}`);
  console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${keyPath}\n`);

  if (!supabaseUrl || !supabaseKey || !spreadsheetId) {
    console.error('❌ 必要な環境変数が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Google Sheets 認証
  console.log('🔑 Google Sheets 認証中...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: keyPath,
  });
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets 認証成功\n');

  // スプレッドシートから全行取得
  console.log('📊 スプレッドシートからデータ取得中...');
  const allRows = await sheetsClient.readAll();
  const nonEmptyRows = allRows.filter((row: any) => {
    const pn = row['物件番号'];
    return pn && String(pn).trim() !== '';
  });
  console.log(`✅ ${nonEmptyRows.length} 件取得\n`);

  // 最初の3件でカラム名を確認
  if (nonEmptyRows.length > 0) {
    const sampleRow = nonEmptyRows[0];
    const distKeys = Object.keys(sampleRow).filter(
      (k: string) => k.includes('配信') || k.includes('公開')
    );
    console.log('🔍 配信日関連カラム名:', JSON.stringify(distKeys));
    const firstDistVal = sampleRow['配信日【公開）'] || sampleRow['配信日【公開)'] || sampleRow['配信日(公開)'] || sampleRow['配信日（公開）'] || null;
    console.log(`🔍 最初の行の配信日値: "${firstDistVal}"\n`);
  }

  // バッチ更新
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log('🔄 DB更新開始...');

  for (const row of nonEmptyRows) {
    const propertyNumber = String(row['物件番号'] || '').trim();
    if (!propertyNumber) continue;

    // 複数のカラム名を試す
    const distVal =
      row['配信日【公開）'] ||
      row['配信日【公開)'] ||
      row['配信日(公開)'] ||
      row['配信日（公開）'] ||
      null;

    try {
      const { error } = await supabase
        .from('property_listings')
        .update({
          distribution_date: distVal ? String(distVal) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('property_number', propertyNumber);

      if (error) {
        // レコードが存在しない場合はスキップ
        if (error.code === 'PGRST116') {
          skipped++;
        } else {
          throw error;
        }
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`  進捗: ${updated}件更新済み...`);
        }
      }
    } catch (err: any) {
      failed++;
      errors.push(`${propertyNumber}: ${err.message}`);
      if (failed <= 5) {
        console.error(`  ❌ ${propertyNumber}: ${err.message}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 完了サマリー:');
  console.log(`  ✅ 更新成功: ${updated} 件`);
  console.log(`  ⏭️  スキップ: ${skipped} 件`);
  console.log(`  ❌ 失敗: ${failed} 件`);
  if (errors.length > 0) {
    console.log(`  エラー詳細 (最初の5件):`);
    errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ スクリプト実行エラー:', err);
  process.exit(1);
});
