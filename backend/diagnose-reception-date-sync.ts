// 受付日の同期状況を診断するスクリプト
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnoseReceptionDateSync() {
  console.log('=== 受付日同期診断 ===\n');

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
  
  console.log('1. スプレッドシートのヘッダー確認:');
  console.log(`   総カラム数: ${headers.length}`);
  
  // 6列目（F列、インデックス5）を確認
  const column6Header = headers[5];
  console.log(`   6列目のヘッダー: "${column6Header}"`);
  
  // 受付日カラムを探す
  const receptionDateIndex = headers.indexOf('受付日');
  console.log(`   "受付日"カラムの位置: ${receptionDateIndex >= 0 ? `${receptionDateIndex + 1}列目（${String.fromCharCode(65 + receptionDateIndex)}列）` : '見つかりません'}`);
  
  // 最初の10行のデータを取得
  console.log('\n2. スプレッドシートの受付日データ（最初の10行）:');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:G11`, // 6列目まで含む
  });
  const rows = dataResponse.data.values || [];
  
  rows.forEach((row, index) => {
    const buyerNumber = row[4]; // 買主番号は5列目
    const receptionDate = row[5]; // 6列目
    console.log(`   行${index + 2}: 買主番号=${buyerNumber}, 受付日="${receptionDate}"`);
  });

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // データベースの受付日を確認
  console.log('\n3. データベースの受付日（最初の10件）:');
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date')
    .order('buyer_number', { ascending: false })
    .limit(10);

  if (error) {
    console.error('   エラー:', error.message);
  } else {
    buyers?.forEach(buyer => {
      console.log(`   買主番号=${buyer.buyer_number}, reception_date=${buyer.reception_date || 'NULL'}`);
    });
  }

  // カラムマッピング確認
  console.log('\n4. カラムマッピング設定確認:');
  const columnMapping = require('./src/config/buyer-column-mapping.json');
  const receptionDateMapping = columnMapping.spreadsheetToDatabase['受付日'];
  console.log(`   "受付日" → "${receptionDateMapping}"`);
  
  const typeConversion = columnMapping.typeConversions['reception_date'];
  console.log(`   reception_dateの型変換: ${typeConversion || 'なし'}`);

  console.log('\n=== 診断完了 ===');
}

diagnoseReceptionDateSync().catch(console.error);
