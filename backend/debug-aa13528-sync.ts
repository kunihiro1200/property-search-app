/**
 * AA13528の同期処理をデバッグするスクリプト
 * 定期同期でinquiry_dateが消える原因を調査
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// formatInquiryDateメソッドをコピー
function formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryYear || !inquiryDate) return null;
  
  const year = parseNumeric(inquiryYear);
  if (year === null) return null;
  
  const dateStr = String(inquiryDate).trim();
  
  // Excelシリアル値（数値）の場合
  if (/^\d+$/.test(dateStr)) {
    const serialNumber = parseInt(dateStr, 10);
    // Excelシリアル値の範囲チェック（30000〜60000程度が妥当）
    if (serialNumber > 30000 && serialNumber < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      const y = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }
  }
  
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

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function main() {
  console.log('🔍 AA13528の同期処理をデバッグします...\n');

  // 1. スプレッドシートからデータを取得
  console.log('📊 Step 1: スプレッドシートからデータを取得');
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const allRows = await sheetsClient.readAll();
  const row = allRows.find((r: any) => r['売主番号'] === 'AA13528');
  
  if (!row) {
    console.log('❌ AA13528がスプレッドシートに見つかりません');
    return;
  }

  console.log('  売主番号:', row['売主番号']);
  console.log('  反響年:', row['反響年'], `(type: ${typeof row['反響年']})`);
  console.log('  反響日付:', row['反響日付'], `(type: ${typeof row['反響日付']})`);
  console.log('  状況（当社）:', row['状況（当社）']);
  console.log('  次電日:', row['次電日'], `(type: ${typeof row['次電日']})`);
  console.log('  不通:', row['不通']);
  console.log('  営担:', row['営担']);

  // 2. formatInquiryDateの結果を確認
  console.log('\n📊 Step 2: formatInquiryDateの結果を確認');
  const inquiryYear = row['反響年'];
  const inquiryDate = row['反響日付'];
  
  console.log('  inquiryYear:', inquiryYear, `(type: ${typeof inquiryYear})`);
  console.log('  inquiryDate:', inquiryDate, `(type: ${typeof inquiryDate})`);
  console.log('  !inquiryYear:', !inquiryYear);
  console.log('  !inquiryDate:', !inquiryDate);
  
  const formattedInquiryDate = formatInquiryDate(inquiryYear, inquiryDate);
  console.log('  formatInquiryDate結果:', formattedInquiryDate);

  // 3. DBの現在の状態を確認
  console.log('\n📊 Step 3: DBの現在の状態を確認');
  const { data: dbSeller, error } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, status, next_call_date, unreachable_status, visit_assignee')
    .eq('seller_number', 'AA13528')
    .single();

  if (error) {
    console.error('❌ DBエラー:', error.message);
    return;
  }

  console.log('  DB inquiry_date:', dbSeller.inquiry_date);
  console.log('  DB inquiry_year:', dbSeller.inquiry_year);
  console.log('  DB status:', dbSeller.status);
  console.log('  DB next_call_date:', dbSeller.next_call_date);
  console.log('  DB unreachable_status:', dbSeller.unreachable_status);
  console.log('  DB visit_assignee:', dbSeller.visit_assignee);

  // 4. 更新対象として検出されるか確認
  console.log('\n📊 Step 4: 更新対象として検出されるか確認');
  const dbInquiryDate = dbSeller.inquiry_date ? String(dbSeller.inquiry_date).substring(0, 10) : null;
  console.log('  スプレッドシート inquiry_date:', formattedInquiryDate);
  console.log('  DB inquiry_date:', dbInquiryDate);
  console.log('  異なる?:', formattedInquiryDate !== dbInquiryDate);

  // 5. 当日TEL_未着手の条件チェック
  console.log('\n📊 Step 5: 当日TEL_未着手の条件チェック');
  const hasTrackingStatus = dbSeller.status?.includes('追客中');
  const inquiryDateAfterCutoff = dbSeller.inquiry_date >= '2026-01-01';
  const unreachableEmpty = !dbSeller.unreachable_status || dbSeller.unreachable_status === '';
  const visitAssigneeEmpty = !dbSeller.visit_assignee || dbSeller.visit_assignee === '';
  
  console.log('  1. 追客中を含む:', hasTrackingStatus ? '✅' : '❌', `(status="${dbSeller.status}")`);
  console.log('  2. inquiry_date >= 2026-01-01:', inquiryDateAfterCutoff ? '✅' : '❌', `(inquiry_date="${dbSeller.inquiry_date}")`);
  console.log('  3. unreachable_status が空:', unreachableEmpty ? '✅' : '❌', `(unreachable_status="${dbSeller.unreachable_status || ''}")`);
  console.log('  4. visit_assignee が空:', visitAssigneeEmpty ? '✅' : '❌', `(visit_assignee="${dbSeller.visit_assignee || ''}")`);

  // 6. 実際に更新を実行（テスト）
  console.log('\n📊 Step 6: 実際に更新を実行');
  if (inquiryDate) {
    const updateInquiryDate = formatInquiryDate(inquiryYear, inquiryDate);
    console.log('  更新する inquiry_date:', updateInquiryDate);
    
    if (updateInquiryDate) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ inquiry_date: updateInquiryDate })
        .eq('seller_number', 'AA13528');
      
      if (updateError) {
        console.error('❌ 更新エラー:', updateError.message);
      } else {
        console.log('✅ 更新成功');
      }
    } else {
      console.log('⚠️ updateInquiryDateがnullのため更新しません');
    }
  } else {
    console.log('⚠️ inquiryDateが空のため更新しません');
  }

  // 7. 更新後のDBの状態を確認
  console.log('\n📊 Step 7: 更新後のDBの状態を確認');
  const { data: updatedSeller, error: fetchError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA13528')
    .single();

  if (fetchError) {
    console.error('❌ DBエラー:', fetchError.message);
    return;
  }

  console.log('  DB inquiry_date:', updatedSeller.inquiry_date);
  console.log('  DB inquiry_year:', updatedSeller.inquiry_year);
}

main().catch(console.error);
