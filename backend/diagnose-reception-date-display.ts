import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnoseReceptionDate() {
  console.log('=== 受付日表示問題の診断 ===\n');

  // 1. スプレッドシートから受付日データを確認
  console.log('1. スプレッドシートの受付日データを確認中...');
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../backend/google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 受付日の列インデックスを確認
  const receptionDateIndex = headers.indexOf('受付日');
  console.log(`   受付日の列インデックス: ${receptionDateIndex} (${receptionDateIndex >= 0 ? String.fromCharCode(65 + receptionDateIndex) : 'なし'}列)`);
  
  if (receptionDateIndex < 0) {
    console.log('   ❌ エラー: スプレッドシートに「受付日」列が見つかりません');
    return;
  }

  // 最初の10行のデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:${String.fromCharCode(65 + Math.max(receptionDateIndex + 5, 20))}11`,
  });
  const rows = dataResponse.data.values || [];
  
  console.log(`\n   スプレッドシートの受付日データ（最初の10行）:`);
  let hasData = 0;
  let noData = 0;
  
  rows.forEach((row, index) => {
    const buyerNumber = row[4]; // 買主番号は5列目（インデックス4）
    const receptionDate = row[receptionDateIndex];
    if (receptionDate && receptionDate.trim() !== '') {
      console.log(`   行${index + 2}: 買主番号=${buyerNumber}, 受付日="${receptionDate}"`);
      hasData++;
    } else {
      noData++;
    }
  });
  
  console.log(`\n   統計: データあり=${hasData}件, データなし=${noData}件`);

  // 2. データベースの受付日を確認
  console.log('\n2. データベースの受付日データを確認中...');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date')
    .order('buyer_number', { ascending: false })
    .limit(10);

  if (error) {
    console.log(`   ❌ エラー: ${error.message}`);
    return;
  }

  console.log(`\n   データベースの受付日データ（最新10件）:`);
  let dbHasData = 0;
  let dbNoData = 0;
  
  buyers?.forEach(buyer => {
    if (buyer.reception_date) {
      console.log(`   買主番号=${buyer.buyer_number}, 受付日="${buyer.reception_date}"`);
      dbHasData++;
    } else {
      dbNoData++;
    }
  });
  
  console.log(`\n   統計: データあり=${dbHasData}件, データなし=${dbNoData}件`);

  // 3. 特定の買主で詳細確認
  console.log('\n3. 特定の買主で詳細確認...');
  
  // スプレッドシートから買主番号6647のデータを取得
  const allDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:Z`,
  });
  const allRows = allDataResponse.data.values || [];
  
  const testBuyerNumber = '6647';
  const buyerRow = allRows.find(row => row[4] === testBuyerNumber);
  
  if (buyerRow) {
    console.log(`\n   買主番号${testBuyerNumber}のスプレッドシートデータ:`);
    console.log(`   受付日: "${buyerRow[receptionDateIndex]}"`);
    
    // データベースで確認
    const { data: dbBuyer } = await supabase
      .from('buyers')
      .select('buyer_number, reception_date, last_synced_at')
      .eq('buyer_number', testBuyerNumber)
      .single();
    
    if (dbBuyer) {
      console.log(`\n   買主番号${testBuyerNumber}のデータベースデータ:`);
      console.log(`   受付日: "${dbBuyer.reception_date}"`);
      console.log(`   最終同期: ${dbBuyer.last_synced_at}`);
      
      if (buyerRow[receptionDateIndex] && !dbBuyer.reception_date) {
        console.log(`\n   ❌ 問題発見: スプレッドシートにはデータがあるのに、DBには同期されていません`);
      } else if (buyerRow[receptionDateIndex] && dbBuyer.reception_date) {
        console.log(`\n   ✅ 正常: データは正しく同期されています`);
      }
    }
  }

  // 4. フロントエンドの表示設定を確認
  console.log('\n4. フロントエンドの表示設定を確認する必要があります');
  console.log('   frontend/src/pages/BuyersPage.tsx を確認してください');
  
  console.log('\n=== 診断完了 ===');
}

diagnoseReceptionDate().catch(console.error);
