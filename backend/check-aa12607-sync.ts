import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
const SHEET_NAME = '業務依頼';
const PROPERTY_NUMBER = 'AA12607';

async function checkAA12607Sync() {
  console.log('=== AA12607 同期状態確認 ===\n');

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Google Sheets接続
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. データベースの値を確認
  console.log('1. データベースの値:');
  const { data: dbData, error: dbError } = await supabase
    .from('work_tasks')
    .select('property_number, accounting_confirmed, settlement_completed_chat, payment_confirmed_seller, payment_confirmed_buyer')
    .eq('property_number', PROPERTY_NUMBER)
    .single();

  if (dbError) {
    console.error('データベースエラー:', dbError);
  } else if (dbData) {
    console.log('  物件番号:', dbData.property_number);
    console.log('  経理確認済み:', dbData.accounting_confirmed || '(空)');
    console.log('  決済完了チャット:', dbData.settlement_completed_chat || '(空)');
    console.log('  入金確認（売）:', dbData.payment_confirmed_seller || '(空)');
    console.log('  入金確認（買）:', dbData.payment_confirmed_buyer || '(空)');
  } else {
    console.log('  データが見つかりません');
  }

  // 2. スプレッドシートの値を確認
  console.log('\n2. スプレッドシートの値:');
  
  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // データ行を取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!2:1000`,
  });
  const rows = dataResponse.data.values || [];

  // 物件番号のカラムインデックスを取得
  const propertyNumberIndex = headers.indexOf('物件番号');
  const accountingConfirmedIndex = headers.indexOf('経理確認済み');
  const settlementCompletedChatIndex = headers.indexOf('決済完了チャット');
  const paymentConfirmedSellerIndex = headers.indexOf('入金確認（売）');
  const paymentConfirmedBuyerIndex = headers.indexOf('入金確認（買）');

  // 該当行を検索
  const targetRow = rows.find(row => row[propertyNumberIndex] === PROPERTY_NUMBER);
  
  if (targetRow) {
    console.log('  物件番号:', targetRow[propertyNumberIndex]);
    console.log('  経理確認済み:', targetRow[accountingConfirmedIndex] || '(空)');
    console.log('  決済完了チャット:', targetRow[settlementCompletedChatIndex] || '(空)');
    console.log('  入金確認（売）:', targetRow[paymentConfirmedSellerIndex] || '(空)');
    console.log('  入金確認（買）:', targetRow[paymentConfirmedBuyerIndex] || '(空)');
  } else {
    console.log('  データが見つかりません');
  }

  // 3. 同期ルールの確認
  console.log('\n3. 同期ルール:');
  console.log('  経理確認済み: ブラウザ→スプシ（ブラウザ専用フィールド）');
  console.log('  決済完了チャット: ブラウザ→スプシ（ブラウザ専用フィールド）');
  console.log('  入金確認（売）: ブラウザ→スプシ（ブラウザ専用フィールド）');
  console.log('  入金確認（買）: ブラウザ→スプシ（ブラウザ専用フィールド）');

  console.log('\n4. 期待される動作:');
  console.log('  - スプレッドシート同期時、ブラウザ専用フィールドは上書きされない');
  console.log('  - ブラウザで設定した値が保持される');
  console.log('  - スプレッドシートの値は無視される');
}

checkAA12607Sync().catch(console.error);
