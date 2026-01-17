// 受付日の同期状況を詳細診断するスクリプト
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnoseReceptionDateDetailed() {
  console.log('=== 受付日同期詳細診断 ===\n');

  // Google Sheets接続
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 買主番号と受付日のインデックスを確認
  const buyerNumberIndex = headers.indexOf('買主番号');
  const receptionDateIndex = headers.indexOf('受付日');
  
  console.log(`買主番号の位置: ${buyerNumberIndex + 1}列目`);
  console.log(`受付日の位置: ${receptionDateIndex + 1}列目\n`);

  // 買主番号2064のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  
  console.log('スプレッドシートから買主番号2064を検索:');
  const buyer2064Row = rows.find(row => String(row[buyerNumberIndex]) === '2064');
  
  if (buyer2064Row) {
    console.log(`  見つかりました！`);
    console.log(`  買主番号: ${buyer2064Row[buyerNumberIndex]}`);
    console.log(`  受付日（生データ）: "${buyer2064Row[receptionDateIndex]}"`);
    console.log(`  受付日の型: ${typeof buyer2064Row[receptionDateIndex]}`);
    
    // 日付パース処理をテスト
    const rawDate = buyer2064Row[receptionDateIndex];
    console.log(`\n日付パース処理のテスト:`);
    console.log(`  入力: "${rawDate}"`);
    
    // YYYY/MM/DD形式のパース
    const match = String(rawDate).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      const parsed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`  パース結果: "${parsed}"`);
    } else {
      console.log(`  パース失敗: 正規表現にマッチしません`);
    }
  } else {
    console.log(`  見つかりませんでした`);
  }

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // データベースの買主番号2064を確認
  console.log(`\nデータベースから買主番号2064を検索:`);
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date')
    .eq('buyer_number', '2064')
    .single();

  if (error) {
    console.error(`  エラー: ${error.message}`);
  } else if (buyer) {
    console.log(`  見つかりました！`);
    console.log(`  買主番号: ${buyer.buyer_number}`);
    console.log(`  reception_date: ${buyer.reception_date || 'NULL'}`);
  } else {
    console.log(`  見つかりませんでした`);
  }

  // 受付日がNULLでない買主を検索
  console.log(`\nデータベースで受付日がNULLでない買主を検索:`);
  const { data: buyersWithDate, error: error2 } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date')
    .not('reception_date', 'is', null)
    .limit(5);

  if (error2) {
    console.error(`  エラー: ${error2.message}`);
  } else if (buyersWithDate && buyersWithDate.length > 0) {
    console.log(`  ${buyersWithDate.length}件見つかりました:`);
    buyersWithDate.forEach(b => {
      console.log(`    買主番号=${b.buyer_number}, reception_date=${b.reception_date}`);
    });
  } else {
    console.log(`  受付日がNULLでない買主は0件です`);
  }

  console.log('\n=== 診断完了 ===');
}

diagnoseReceptionDateDetailed().catch(console.error);
