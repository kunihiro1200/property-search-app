/**
 * 既存の売主データのサイトフィールドを修正するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixSiteField() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // スプレッドシートから全データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();

  console.log(`📊 スプレッドシートから${allRows.length}件のデータを取得`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    const site = row['サイト'];

    if (!sellerNumber) {
      skippedCount++;
      continue;
    }

    // サイト情報がある場合のみ更新
    const siteStr = typeof site === 'string' ? site.trim() : String(site || '').trim();
    if (siteStr !== '') {
      try {
        const { error } = await supabase
          .from('sellers')
          .update({ site: siteStr })
          .eq('seller_number', sellerNumber);

        if (error) {
          console.error(`❌ ${sellerNumber}: ${error.message}`);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 100 === 0) {
            console.log(`✅ ${updatedCount}件更新完了...`);
          }
        }
      } catch (error: any) {
        console.error(`❌ ${sellerNumber}: ${error.message}`);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 修正結果:');
  console.log(`  更新: ${updatedCount}件`);
  console.log(`  スキップ: ${skippedCount}件`);
  console.log(`  エラー: ${errorCount}件`);
  console.log('='.repeat(80));
}

fixSiteField().catch(console.error);
