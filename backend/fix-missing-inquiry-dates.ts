/**
 * inquiry_dateがnullだがinquiry_yearが存在する売主を検出し、
 * スプレッドシートから反響日付を取得して修正するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryYear || !inquiryDate) return null;
  
  const year = parseNumeric(inquiryYear);
  if (year === null) return null;
  
  const dateStr = String(inquiryDate).trim();
  
  // MM/DD 形式の場合
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    const [month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD 形式の場合（年が含まれている）
  if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [y, month, day] = dateStr.split('/');
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

async function fix() {
  console.log('=== inquiry_dateがnullの売主を検出 ===\n');
  
  // inquiry_dateがnullだがinquiry_yearが存在する売主を取得
  const { data: sellersWithMissingDate, error: selectError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .is('inquiry_date', null)
    .not('inquiry_year', 'is', null)
    .order('seller_number', { ascending: false })
    .limit(100);
  
  if (selectError) {
    console.log('Error:', selectError.message);
    return;
  }
  
  console.log(`inquiry_dateがnullの売主: ${sellersWithMissingDate?.length || 0}件\n`);
  
  if (!sellersWithMissingDate || sellersWithMissingDate.length === 0) {
    console.log('修正が必要な売主はありません。');
    return;
  }
  
  // スプレッドシートからデータを取得
  console.log('スプレッドシートからデータを取得中...\n');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];
  
  // ヘッダーインデックスを取得
  const sellerNumberIndex = 0; // B列
  const inquiryYearIndex = headers.findIndex((h: string) => h === '反響年');
  const inquiryDateIndex = headers.findIndex((h: string) => h === '反響日付');
  
  console.log(`ヘッダーインデックス: 反響年=${inquiryYearIndex}, 反響日付=${inquiryDateIndex}\n`);
  
  // 売主番号をキーにしたマップを作成
  const spreadsheetData = new Map<string, { inquiryYear: any; inquiryDate: any }>();
  rows.slice(1).forEach((row: any[]) => {
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber) {
      spreadsheetData.set(sellerNumber, {
        inquiryYear: row[inquiryYearIndex],
        inquiryDate: row[inquiryDateIndex],
      });
    }
  });
  
  // 修正を実行
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const seller of sellersWithMissingDate) {
    const sheetData = spreadsheetData.get(seller.seller_number);
    
    if (!sheetData) {
      console.log(`❌ ${seller.seller_number}: スプレッドシートに見つかりません`);
      errorCount++;
      continue;
    }
    
    const formattedDate = formatInquiryDate(sheetData.inquiryYear, sheetData.inquiryDate);
    
    if (!formattedDate) {
      console.log(`⚠️ ${seller.seller_number}: 日付をフォーマットできません (year=${sheetData.inquiryYear}, date=${sheetData.inquiryDate})`);
      continue;
    }
    
    // データベースを更新
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ inquiry_date: formattedDate })
      .eq('seller_number', seller.seller_number);
    
    if (updateError) {
      console.log(`❌ ${seller.seller_number}: 更新エラー - ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${seller.seller_number}: inquiry_date を ${formattedDate} に修正`);
      fixedCount++;
    }
  }
  
  console.log(`\n=== 完了 ===`);
  console.log(`修正: ${fixedCount}件`);
  console.log(`エラー: ${errorCount}件`);
}

fix().catch(console.error);
