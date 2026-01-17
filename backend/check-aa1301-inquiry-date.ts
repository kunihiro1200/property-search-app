/**
 * AA1301の反響日付を確認
 * スプレッドシートとDBの両方をチェック
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { config } from 'dotenv';

config();

async function checkAA1301InquiryDate() {
  console.log('🔍 Checking AA1301 inquiry date...\n');

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. DBから取得
  console.log('📊 Database:');
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year, created_at, updated_at')
    .eq('seller_number', 'AA1301')
    .single();

  if (dbError) {
    console.error('❌ DB Error:', dbError.message);
  } else if (dbSeller) {
    console.log('  Seller Number:', dbSeller.seller_number);
    console.log('  Inquiry Date:', dbSeller.inquiry_date);
    console.log('  Inquiry Year:', dbSeller.inquiry_year);
    console.log('  Created At:', dbSeller.created_at);
    console.log('  Updated At:', dbSeller.updated_at);
  } else {
    console.log('  ❌ Not found in database');
  }

  // 2. スプレッドシートから取得
  console.log('\n📄 Spreadsheet:');
  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    const aa1301Row = allRows.find((row: any) => row['売主番号'] === 'AA1301');
    
    if (aa1301Row) {
      console.log('  売主番号:', aa1301Row['売主番号']);
      console.log('  反響日付:', aa1301Row['反響日付']);
      console.log('  反響年:', aa1301Row['反響年']);
      console.log('  Raw 反響日付 value:', JSON.stringify(aa1301Row['反響日付']));
      console.log('  Type:', typeof aa1301Row['反響日付']);
      
      // 日付のパース処理をテスト
      const inquiryDateValue = aa1301Row['反響日付'];
      console.log('\n🔧 Date parsing test:');
      
      if (inquiryDateValue) {
        const str = String(inquiryDateValue).trim();
        console.log('  String value:', str);
        
        // YYYY/MM/DD 形式
        if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
          const [year, month, day] = str.split('/');
          const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('  Parsed as YYYY/MM/DD:', formatted);
        }
        // YYYY-MM-DD 形式
        else if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          const [year, month, day] = str.split('-');
          const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('  Parsed as YYYY-MM-DD:', formatted);
        }
        // MM/DD/YYYY 形式（誤った形式）
        else if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          console.log('  ⚠️  Detected MM/DD/YYYY format (incorrect):', str);
          const [month, day, year] = str.split('/');
          const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('  Would be parsed as:', formatted);
        }
        else {
          console.log('  ⚠️  Unknown format:', str);
        }
      }
    } else {
      console.log('  ❌ Not found in spreadsheet');
    }
  } catch (error: any) {
    console.error('❌ Spreadsheet Error:', error.message);
  }

  console.log('\n✅ Check complete');
  process.exit(0);
}

checkAA1301InquiryDate().catch(console.error);
