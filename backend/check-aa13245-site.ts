/**
 * AA13245のサイトフィールドを確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { google } from 'googleapis';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSiteField() {
  console.log('=== AA13245 サイトフィールド確認 ===\n');

  // 1. DBからAA13245のデータを取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, site, inquiry_source, inquiry_date, status')
    .eq('seller_number', 'AA13245')
    .single();

  if (error) {
    console.error('DB取得エラー:', error.message);
    return;
  }

  console.log('📊 DBのデータ:');
  console.log('  seller_number:', seller.seller_number);
  console.log('  site:', seller.site || '(空)');
  console.log('  inquiry_source:', seller.inquiry_source || '(空)');
  console.log('  inquiry_date:', seller.inquiry_date);
  console.log('  status:', seller.status);
  console.log('');

  // 2. スプレッドシートからデータを取得
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    // ヘッダー行を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!1:1',
    });
    const headers = headerResponse.data.values?.[0] || [];
    
    // サイト列のインデックスを探す
    const siteIndex = headers.findIndex((h: string) => h === 'サイト' || h === 'site');
    console.log('📋 スプレッドシートのサイト列インデックス:', siteIndex);
    console.log('   ヘッダー名:', headers[siteIndex] || '(見つからない)');

    // AA13245の行を探す
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!A:Z',
    });
    const rows = dataResponse.data.values || [];
    
    // 売主番号列を探す
    const sellerNumberIndex = headers.findIndex((h: string) => 
      h === '売主番号' || h === 'seller_number' || h === '売主No'
    );
    console.log('   売主番号列インデックス:', sellerNumberIndex);

    // AA13245の行を探す
    const targetRow = rows.find((row: string[]) => 
      row[sellerNumberIndex] === 'AA13245'
    );

    if (targetRow) {
      console.log('\n📋 スプレッドシートのデータ:');
      console.log('  売主番号:', targetRow[sellerNumberIndex]);
      console.log('  サイト値:', targetRow[siteIndex] || '(空)');
      
      // 周辺の列も表示
      console.log('\n  周辺の列データ:');
      for (let i = Math.max(0, siteIndex - 2); i <= Math.min(headers.length - 1, siteIndex + 2); i++) {
        console.log(`    ${headers[i]}: ${targetRow[i] || '(空)'}`);
      }
    } else {
      console.log('❌ スプレッドシートにAA13245が見つかりません');
    }

    // 最新の売主のサイトデータも確認
    console.log('\n=== 最新売主のサイトデータ確認 ===');
    const { data: recentSellers } = await supabase
      .from('sellers')
      .select('seller_number, site, inquiry_date')
      .order('inquiry_date', { ascending: false })
      .limit(10);

    console.log('\n最新10件の売主:');
    recentSellers?.forEach(s => {
      console.log(`  ${s.seller_number}: site=${s.site || '(空)'}, inquiry_date=${s.inquiry_date}`);
    });

  } catch (sheetError: any) {
    console.error('スプレッドシート取得エラー:', sheetError.message);
  }
}

checkSiteField().catch(console.error);
