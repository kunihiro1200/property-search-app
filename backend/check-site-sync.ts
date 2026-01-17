/**
 * サイトフィールドの同期状況を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSiteSync() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. スプレッドシートから最新の売主データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();

  // 最新の5件を確認
  const latestRows = allRows.slice(-5);
  
  console.log('📊 スプレッドシートの最新5件のサイト情報:');
  console.log('='.repeat(80));
  
  for (const row of latestRows) {
    const sellerNumber = row['売主番号'];
    const site = row['サイト'];
    
    console.log(`\n売主番号: ${sellerNumber}`);
    console.log(`  スプレッドシートのサイト: "${site}"`);
    
    // DBから同じ売主を取得
    const { data: seller } = await supabase
      .from('sellers')
      .select('seller_number, site, inquiry_site')
      .eq('seller_number', sellerNumber)
      .single();
    
    if (seller) {
      console.log(`  DBのsite: "${seller.site}"`);
      console.log(`  DBのinquiry_site: "${seller.inquiry_site}"`);
      
      if (!seller.site && !seller.inquiry_site) {
        console.log('  ⚠️ DBにサイト情報がありません！');
      }
    } else {
      console.log('  ❌ DBに売主が見つかりません');
    }
  }

  console.log('\n' + '='.repeat(80));
  
  // 2. DBのスキーマを確認
  console.log('\n📋 sellersテーブルのカラム確認:');
  const { data: columns } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);
  
  if (columns && columns.length > 0) {
    const columnNames = Object.keys(columns[0]);
    const siteColumns = columnNames.filter(col => 
      col.includes('site') || col.includes('inquiry')
    );
    console.log('サイト関連カラム:', siteColumns);
  }
}

checkSiteSync().catch(console.error);
