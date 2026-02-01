/**
 * AA13528の状況（売主）を同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 AA13528の状況（売主）を同期します...');

  // スプレッドシートからデータを取得
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  
  const allRows = await sheetsClient.readAll();
  
  // AA13528を検索
  const row = allRows.find((r: any) => r['売主番号'] === 'AA13528');
  
  if (!row) {
    console.log('❌ AA13528がスプレッドシートに見つかりません');
    return;
  }
  
  console.log('📊 スプレッドシートのデータ:');
  console.log('  売主番号:', row['売主番号']);
  console.log('  状況（売主）:', row['状況（売主）']);
  console.log('  反響日付:', row['反響日付']);
  console.log('  反響年:', row['反響年']);
  
  // データベースを更新
  const updateData: any = {};
  
  if (row['状況（売主）']) {
    updateData.current_status = String(row['状況（売主）']);
  }
  
  // 反響日付を更新（反響年と組み合わせ）
  const inquiryYear = row['反響年'];
  const inquiryDate = row['反響日付'];
  
  if (inquiryDate) {
    // 日付をパース
    const dateStr = String(inquiryDate);
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (match && inquiryYear) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      updateData.inquiry_date = `${inquiryYear}-${month}-${day}`;
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
    .eq('seller_number', 'AA13528');
  
  if (error) {
    console.error('❌ 更新エラー:', error.message);
    return;
  }
  
  console.log('✅ AA13528を更新しました');
  
  // 更新後のデータを確認
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, current_status, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA13528')
    .single();
  
  console.log('\n📊 更新後のデータベース:');
  console.log('  売主番号:', seller?.seller_number);
  console.log('  current_status:', seller?.current_status);
  console.log('  inquiry_date:', seller?.inquiry_date);
  console.log('  inquiry_year:', seller?.inquiry_year);
}

main().catch(console.error);
