/**
 * AA13528が更新対象として検出されるか確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
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
    if (serialNumber > 30000 && serialNumber < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      const y = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }
  }
  
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    const [month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
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
  console.log('🔍 AA13528が更新対象として検出されるか確認します...\n');

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
  const sheetRow = allRows.find((r: any) => r['売主番号'] === 'AA13528');
  
  if (!sheetRow) {
    console.log('❌ AA13528がスプレッドシートに見つかりません');
    return;
  }

  // 2. DBからデータを取得
  console.log('\n📊 Step 2: DBからデータを取得');
  const { data: dbSeller, error } = await supabase
    .from('sellers')
    .select('seller_number, status, contract_year_month, visit_assignee, phone_contact_person, preferred_contact_time, contact_method, next_call_date, current_status, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA13528')
    .single();

  if (error) {
    console.error('❌ DBエラー:', error.message);
    return;
  }

  // 3. detectUpdatedSellersのロジックをシミュレート
  console.log('\n📊 Step 3: detectUpdatedSellersのロジックをシミュレート');
  
  let needsUpdate = false;
  const reasons: string[] = [];

  // inquiry_dateの比較（反響日付）
  const sheetInquiryDate = sheetRow['反響日付'];
  const sheetInquiryYear = sheetRow['反響年'];
  const dbInquiryDate = dbSeller.inquiry_date ? String(dbSeller.inquiry_date).substring(0, 10) : null;
  
  console.log('  sheetInquiryDate:', sheetInquiryDate, `(type: ${typeof sheetInquiryDate})`);
  console.log('  sheetInquiryYear:', sheetInquiryYear, `(type: ${typeof sheetInquiryYear})`);
  console.log('  dbInquiryDate:', dbInquiryDate);
  
  if (sheetInquiryDate) {
    const formattedInquiryDate = formatInquiryDate(sheetInquiryYear, sheetInquiryDate);
    console.log('  formattedInquiryDate:', formattedInquiryDate);
    
    if (formattedInquiryDate !== dbInquiryDate) {
      needsUpdate = true;
      reasons.push(`inquiry_date: ${dbInquiryDate} -> ${formattedInquiryDate}`);
    }
  } else if (sheetInquiryYear && !dbInquiryDate) {
    needsUpdate = true;
    reasons.push(`inquiry_date: null -> ${sheetInquiryYear}-01-01 (inquiryYear only)`);
  }

  // statusの比較
  const sheetStatus = sheetRow['状況（当社）'];
  if (sheetStatus && sheetStatus !== dbSeller.status) {
    needsUpdate = true;
    reasons.push(`status: ${dbSeller.status} -> ${sheetStatus}`);
  }

  // visit_assigneeの比較
  const sheetVisitAssignee = sheetRow['営担'];
  if (sheetVisitAssignee && sheetVisitAssignee !== dbSeller.visit_assignee) {
    needsUpdate = true;
    reasons.push(`visit_assignee: ${dbSeller.visit_assignee} -> ${sheetVisitAssignee}`);
  }

  console.log('\n📊 Step 4: 結果');
  console.log('  更新が必要:', needsUpdate ? '✅ はい' : '❌ いいえ');
  if (reasons.length > 0) {
    console.log('  理由:');
    for (const reason of reasons) {
      console.log('    -', reason);
    }
  }

  // 5. 実際に更新を実行
  if (needsUpdate) {
    console.log('\n📊 Step 5: 実際に更新を実行');
    const formattedInquiryDate = formatInquiryDate(sheetInquiryYear, sheetInquiryDate);
    
    if (formattedInquiryDate) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ inquiry_date: formattedInquiryDate })
        .eq('seller_number', 'AA13528');
      
      if (updateError) {
        console.error('❌ 更新エラー:', updateError.message);
      } else {
        console.log('✅ 更新成功: inquiry_date =', formattedInquiryDate);
      }
    }
  }
}

main().catch(console.error);
