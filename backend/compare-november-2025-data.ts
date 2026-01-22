import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function compareNovember2025Data() {
  console.log('=== 2025年11月データの比較: スプレッドシート vs データベース ===\n');

  try {
    // スプレッドシートからデータ取得
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    console.log(`スプレッドシートから ${rows.length} 件取得\n`);

    // 2025年11月の反響を持つ行を抽出
    const november2025Rows = rows.filter(row => {
      const inquiryDate = row['反響日付'];
      if (!inquiryDate || inquiryDate === 'null') return false;
      const dateStr = inquiryDate.toString();
      return dateStr.includes('2025/11') || dateStr.includes('2025-11');
    });

    console.log(`スプレッドシート: 2025年11月の反響 ${november2025Rows.length}件\n`);

    // 訪問取得日が存在する行
    const withVisitAcqInSheet = november2025Rows.filter(row => {
      const visitAcqDate = row['訪問取得日\n年/月/日'];
      return visitAcqDate && visitAcqDate !== 'null' && visitAcqDate.toString().trim() !== '';
    });

    console.log(`スプレッドシート: 訪問取得日あり ${withVisitAcqInSheet.length}件`);
    console.log('売主番号:', withVisitAcqInSheet.map(r => r['売主番号']).join(', '));
    console.log('');

    // データベースから取得
    const { data: dbData, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, visit_acquisition_date, visit_date, status')
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('visit_acquisition_date', 'is', null);

    if (error) {
      console.error('データベースエラー:', error);
      return;
    }

    console.log(`データベース: 訪問取得日あり ${dbData?.length || 0}件`);
    console.log('売主番号:', dbData?.map(r => r.seller_number).join(', '));
    console.log('');

    // 差分を確認
    const sheetSellerNumbers = new Set(withVisitAcqInSheet.map(r => r['売主番号']));
    const dbSellerNumbers = new Set(dbData?.map(r => r.seller_number) || []);

    const inSheetNotInDb = [...sheetSellerNumbers].filter(n => !dbSellerNumbers.has(n));
    const inDbNotInSheet = [...dbSellerNumbers].filter(n => !sheetSellerNumbers.has(n));

    if (inSheetNotInDb.length > 0) {
      console.log(`\nスプレッドシートにあるがDBにない (${inSheetNotInDb.length}件):`);
      inSheetNotInDb.forEach(sellerNumber => {
        const row = withVisitAcqInSheet.find(r => r['売主番号'] === sellerNumber);
        console.log(`  ${sellerNumber}:`);
        console.log(`    反響日付: ${row?.['反響日付']}`);
        console.log(`    訪問取得日: ${row?.['訪問取得日\n年/月/日']}`);
      });
    }

    if (inDbNotInSheet.length > 0) {
      console.log(`\nDBにあるがスプレッドシートにない (${inDbNotInSheet.length}件):`);
      console.log(inDbNotInSheet.join(', '));
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

compareNovember2025Data();
