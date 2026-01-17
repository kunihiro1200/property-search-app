/**
 * 売主のサイトフィールドをスプレッドシートから同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncSiteField() {
  console.log('=== サイトフィールド同期 ===\n');

  try {
    // Google Sheets クライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    // DBからsiteが空の売主を取得
    const { data: sellersWithoutSite, error: fetchError } = await supabase
      .from('sellers')
      .select('id, seller_number, site')
      .is('site', null)
      .order('inquiry_date', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('DB取得エラー:', fetchError.message);
      return;
    }

    console.log(`📋 サイトが空の売主: ${sellersWithoutSite?.length || 0}件\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let noSiteCount = 0;

    for (const seller of sellersWithoutSite || []) {
      // スプレッドシートから該当行を取得
      const row = allRows.find((r: any) => r['売主番号'] === seller.seller_number);
      
      if (!row) {
        console.log(`  ❌ ${seller.seller_number}: スプレッドシートに見つかりません`);
        notFoundCount++;
        continue;
      }

      const siteValue = row['サイト'];
      
      if (!siteValue) {
        console.log(`  ⚠️ ${seller.seller_number}: スプレッドシートのサイトも空`);
        noSiteCount++;
        continue;
      }

      // DBを更新
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ site: String(siteValue).trim() })
        .eq('id', seller.id);

      if (updateError) {
        console.log(`  ❌ ${seller.seller_number}: 更新エラー - ${updateError.message}`);
      } else {
        console.log(`  ✅ ${seller.seller_number}: site = "${siteValue}"`);
        updatedCount++;
      }
    }

    console.log('\n=== 同期結果 ===');
    console.log(`  更新成功: ${updatedCount}件`);
    console.log(`  スプレッドシートに見つからない: ${notFoundCount}件`);
    console.log(`  スプレッドシートのサイトも空: ${noSiteCount}件`);

    // AA13245を個別に確認
    console.log('\n=== AA13245の確認 ===');
    const aa13245Row = allRows.find((r: any) => r['売主番号'] === 'AA13245');
    if (aa13245Row) {
      console.log('スプレッドシートのAA13245:');
      console.log('  サイト:', aa13245Row['サイト'] || '(空)');
      console.log('  反響日付:', aa13245Row['反響日付'] || '(空)');
      console.log('  状況:', aa13245Row['状況（当社）'] || '(空)');
    } else {
      console.log('AA13245はスプレッドシートに見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

syncSiteField().catch(console.error);
