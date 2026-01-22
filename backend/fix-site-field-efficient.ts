/**
 * 既存の売主データのサイトフィールドを効率的に修正するスクリプト
 * site が null のレコードのみを更新
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixSiteFieldEfficient() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. DBからsite が null の売主を取得
  const { data: sellersWithNullSite, error: fetchError } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .is('site', null);

  if (fetchError) {
    console.error('❌ DBからのデータ取得エラー:', fetchError);
    return;
  }

  console.log(`📊 site が null の売主: ${sellersWithNullSite?.length || 0}件`);

  if (!sellersWithNullSite || sellersWithNullSite.length === 0) {
    console.log('✅ 更新が必要な売主はありません');
    return;
  }

  // 2. スプレッドシートから全データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();

  // 売主番号をキーとしたマップを作成
  const siteMap = new Map<string, string>();
  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    const site = row['サイト'];
    if (sellerNumber && site) {
      const sellerNumberStr = String(sellerNumber);
      const siteStr = typeof site === 'string' ? site.trim() : String(site).trim();
      if (siteStr !== '') {
        siteMap.set(sellerNumberStr, siteStr);
      }
    }
  }

  console.log(`📊 スプレッドシートからサイト情報を持つ売主: ${siteMap.size}件`);

  // 3. バッチ更新
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const seller of sellersWithNullSite) {
    const site = siteMap.get(seller.seller_number);
    
    if (site) {
      try {
        const { error } = await supabase
          .from('sellers')
          .update({ site })
          .eq('id', seller.id);

        if (error) {
          console.error(`❌ ${seller.seller_number}: ${error.message}`);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 100 === 0) {
            console.log(`✅ ${updatedCount}件更新完了...`);
          }
        }
      } catch (error: any) {
        console.error(`❌ ${seller.seller_number}: ${error.message}`);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 修正結果:');
  console.log(`  更新: ${updatedCount}件`);
  console.log(`  スキップ（スプレッドシートにサイト情報なし）: ${skippedCount}件`);
  console.log(`  エラー: ${errorCount}件`);
  console.log('='.repeat(80));
}

fixSiteFieldEfficient().catch(console.error);
