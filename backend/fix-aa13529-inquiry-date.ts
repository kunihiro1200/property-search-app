/**
 * AA13529のinquiry_dateを同期するスクリプト
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

async function main() {
  console.log('🔍 AA13529のinquiry_dateを同期します...');

  // スプレッドシートからデータを取得
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  
  const allRows = await sheetsClient.readAll();
  
  // AA13529を検索
  const row = allRows.find((r: any) => r['売主番号'] === 'AA13529');
  
  if (!row) {
    console.log('❌ AA13529がスプレッドシートに見つかりません');
    return;
  }
  
  console.log('📊 スプレッドシートのデータ:');
  console.log('  売主番号:', row['売主番号']);
  console.log('  反響日付:', row['反響日付']);
  console.log('  反響年:', row['反響年']);
  
  // 反響日付を更新
  const updateData: any = {};
  const inquiryYear = row['反響年'];
  const inquiryDate = row['反響日付'];
  
  if (inquiryDate) {
    const dateStr = String(inquiryDate);
    // Excelシリアル値の場合
    if (/^\d+$/.test(dateStr)) {
      const serialNumber = parseInt(dateStr, 10);
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      updateData.inquiry_date = `${year}-${month}-${day}`;
    } else {
      // MM/DD形式の場合
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
      if (match && inquiryYear) {
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        updateData.inquiry_date = `${inquiryYear}-${month}-${day}`;
      }
    }
  } else if (inquiryYear) {
    // 反響日付が空でも反響年がある場合、年の1月1日を設定
    updateData.inquiry_date = `${inquiryYear}-01-01`;
  }
  
  console.log('\n📝 更新データ:', updateData);
  
  if (Object.keys(updateData).length === 0) {
    console.log('⚠️ 更新するデータがありません');
    return;
  }
  
  const { error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('seller_number', 'AA13529');
  
  if (error) {
    console.error('❌ 更新エラー:', error.message);
    return;
  }
  
  console.log('✅ AA13529を更新しました');
  
  // 更新後のデータを確認
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA13529')
    .single();
  
  console.log('\n📊 更新後のデータベース:');
  console.log('  seller_number:', seller?.seller_number);
  console.log('  inquiry_date:', seller?.inquiry_date);
  console.log('  inquiry_year:', seller?.inquiry_year);
}

main().catch(console.error);
