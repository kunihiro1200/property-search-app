/**
 * 訪問日（visit_date）のみを同期するスクリプト
 * column-mapping.jsonの修正後に実行
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 訪問日（visit_date）の同期を開始 ===\n');

  // Google Sheets API認証
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];
  
  // カラムインデックスを取得
  const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
  const visitDateIndex = headers.findIndex((h: string) => h === '訪問日 Y/M/D');
  const visitAssigneeIndex = headers.findIndex((h: string) => h === '営担');

  console.log(`売主番号カラム: 列${sellerNumberIndex + 1}`);
  console.log(`訪問日カラム: 列${visitDateIndex + 1} (${headers[visitDateIndex]})`);
  console.log(`営担カラム: 列${visitAssigneeIndex + 1} (${headers[visitAssigneeIndex]})`);

  if (visitDateIndex < 0) {
    console.error('訪問日カラムが見つかりません');
    return;
  }

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:CZ`,
  });

  const rows = dataResponse.data.values || [];
  console.log(`\n全データ行数: ${rows.length}`);

  // 訪問日があるデータを抽出
  const updates: { sellerNumber: string; visitDate: string; visitAssignee: string }[] = [];
  
  rows.forEach((row: string[]) => {
    const sellerNumber = row[sellerNumberIndex - 1]; // -1 because data starts from column B
    const visitDate = row[visitDateIndex - 1];
    const visitAssignee = row[visitAssigneeIndex - 1];

    if (sellerNumber && visitDate && visitDate.trim()) {
      updates.push({ sellerNumber, visitDate, visitAssignee });
    }
  });

  console.log(`訪問日があるデータ: ${updates.length}件`);

  // 日付をパース
  function parseDate(value: string): string | null {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;

    // YYYY/MM/DD or YYYY-MM-DD
    const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  }

  // バッチ更新
  let successCount = 0;
  let errorCount = 0;
  const batchSize = 50;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const item of batch) {
      const parsedDate = parseDate(item.visitDate);
      
      if (!parsedDate) {
        console.log(`  ${item.sellerNumber}: 日付パースエラー (${item.visitDate})`);
        errorCount++;
        continue;
      }

      const { error } = await supabase
        .from('sellers')
        .update({ visit_date: parsedDate })
        .eq('seller_number', item.sellerNumber);

      if (error) {
        console.log(`  ${item.sellerNumber}: 更新エラー - ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`進捗: ${Math.min(i + batchSize, updates.length)}/${updates.length} (成功: ${successCount}, エラー: ${errorCount})`);
  }

  console.log(`\n=== 同期完了 ===`);
  console.log(`成功: ${successCount}件`);
  console.log(`エラー: ${errorCount}件`);

  // 確認
  console.log('\n=== 同期後の確認 ===');
  const { data: checkData, error: checkError } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .not('visit_date', 'is', null)
    .order('visit_date', { ascending: false })
    .limit(20);

  if (checkError) {
    console.error('確認エラー:', checkError);
  } else {
    console.log(`訪問日がある売主: ${checkData?.length || 0}件（上位20件）`);
    checkData?.forEach(s => {
      console.log(`  ${s.seller_number}: ${s.visit_date} (営担: ${s.visit_assignee})`);
    });
  }
}

main().catch(console.error);
