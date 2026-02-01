/**
 * 全売主の訪問日を再同期（Excelシリアル値対応版）
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 訪問日を YYYY-MM-DD 形式にフォーマット（Excelシリアル値対応）
 */
function formatVisitDate(value: any): string | null {
  if (!value || value === '') return null;
  
  // Excelシリアル値（数値）の場合
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 30000 && numValue < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const str = String(value).trim();
  
  // YYYY/MM/DD 形式の場合
  if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [year, month, day] = str.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD 形式の場合
  if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = str.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

async function main() {
  console.log('=== 全売主の訪問日を再同期 ===\n');

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
  const sellerNumberIdx = headers.findIndex((h: string) => h === '売主番号');
  const visitDateIdx = headers.findIndex((h: string) => h === '訪問日 Y/M/D');
  const visitAssigneeIdx = headers.findIndex((h: string) => h === '営担');

  console.log(`売主番号: 列${sellerNumberIdx + 1}`);
  console.log(`訪問日: 列${visitDateIdx + 1}`);
  console.log(`営担: 列${visitAssigneeIdx + 1}`);

  // データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:DZ`,
  });

  const rows = dataResponse.data.values || [];
  console.log(`\nスプレッドシートの行数: ${rows.length}`);

  // 訪問日があるデータを抽出
  const sellersWithVisitDate: { sellerNumber: string; visitDate: string; visitAssignee: string; rawValue: any }[] = [];
  
  rows.forEach((row: string[]) => {
    const sellerNumber = row[sellerNumberIdx];
    const visitDateRaw = row[visitDateIdx];
    const visitAssignee = row[visitAssigneeIdx] || '';
    
    if (sellerNumber && visitDateRaw) {
      const formattedDate = formatVisitDate(visitDateRaw);
      if (formattedDate) {
        sellersWithVisitDate.push({
          sellerNumber,
          visitDate: formattedDate,
          visitAssignee,
          rawValue: visitDateRaw,
        });
      }
    }
  });

  console.log(`訪問日があるデータ: ${sellersWithVisitDate.length}件`);

  // サンプルを表示
  console.log('\nサンプル（最初の10件）:');
  sellersWithVisitDate.slice(0, 10).forEach(s => {
    console.log(`  ${s.sellerNumber}: 訪問日="${s.visitDate}" (raw: ${s.rawValue}), 営担="${s.visitAssignee}"`);
  });

  // AA9990を確認
  const aa9990 = sellersWithVisitDate.find(s => s.sellerNumber === 'AA9990');
  if (aa9990) {
    console.log(`\nAA9990: 訪問日="${aa9990.visitDate}" (raw: ${aa9990.rawValue}), 営担="${aa9990.visitAssignee}"`);
  } else {
    console.log('\nAA9990: 訪問日データなし');
  }

  // データベースを更新
  console.log('\n=== データベースを更新 ===\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // バッチ処理（100件ずつ）
  const batchSize = 100;
  for (let i = 0; i < sellersWithVisitDate.length; i += batchSize) {
    const batch = sellersWithVisitDate.slice(i, i + batchSize);
    
    for (const seller of batch) {
      const { error } = await supabase
        .from('sellers')
        .update({ 
          visit_date: seller.visitDate,
          updated_at: new Date().toISOString()
        })
        .eq('seller_number', seller.sellerNumber);
      
      if (error) {
        console.error(`  ❌ ${seller.sellerNumber}: ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    }
    
    console.log(`  処理済み: ${Math.min(i + batchSize, sellersWithVisitDate.length)}/${sellersWithVisitDate.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${successCount}件`);
  console.log(`エラー: ${errorCount}件`);

  // 確認
  console.log('\n=== 確認 ===');
  const { data: aa9990Data } = await supabase
    .from('sellers')
    .select('seller_number, visit_date, visit_assignee')
    .eq('seller_number', 'AA9990')
    .single();
  
  if (aa9990Data) {
    console.log(`AA9990: 訪問日="${aa9990Data.visit_date}", 営担="${aa9990Data.visit_assignee}"`);
  }
}

main().catch(console.error);
