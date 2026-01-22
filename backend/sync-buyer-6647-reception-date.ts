import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function syncBuyer6647() {
  console.log('=== 買主番号6647の受付日を再同期 ===\n');

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

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:Z`,
  });
  const rows = dataResponse.data.values || [];

  // 買主番号6647を探す
  const buyerNumberIndex = headers.indexOf('買主番号');
  const receptionDateIndex = headers.indexOf('受付日');
  
  const buyer6647Row = rows.find(row => row[buyerNumberIndex] === '6647');

  if (!buyer6647Row) {
    console.log('❌ 買主番号6647が見つかりません');
    return;
  }

  console.log('スプレッドシートのデータ:');
  console.log(`  買主番号: ${buyer6647Row[buyerNumberIndex]}`);
  console.log(`  受付日（生データ）: "${buyer6647Row[receptionDateIndex]}"`);

  // マッピング
  const mapper = new BuyerColumnMapper();
  const mappedData = mapper.mapSpreadsheetToDatabase(headers, buyer6647Row);

  console.log('\nマッピング後のデータ:');
  console.log(`  buyer_number: ${mappedData.buyer_number}`);
  console.log(`  reception_date: ${mappedData.reception_date}`);

  // データベースに保存
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\nデータベースに保存中...');
  const { error } = await supabase
    .from('buyers')
    .update({ reception_date: mappedData.reception_date })
    .eq('buyer_number', '6647');

  if (error) {
    console.log('❌ エラー:', error.message);
    return;
  }

  console.log('✅ 保存成功');

  // 確認
  const { data: updatedBuyer } = await supabase
    .from('buyers')
    .select('buyer_number, name, reception_date')
    .eq('buyer_number', '6647')
    .single();

  console.log('\n更新後のデータベースデータ:');
  console.log(`  買主番号: ${updatedBuyer?.buyer_number}`);
  console.log(`  氏名: ${updatedBuyer?.name}`);
  console.log(`  受付日: ${updatedBuyer?.reception_date}`);

  console.log('\n=== 完了 ===');
}

syncBuyer6647().catch(console.error);
