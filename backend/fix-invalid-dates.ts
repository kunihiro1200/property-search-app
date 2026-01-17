import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function fixInvalidDates() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase環境変数が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const resolvedKeyPath = path.resolve(process.cwd(), serviceAccountKeyPath!);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: spreadsheetId!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: resolvedKeyPath,
  });
  const columnMapper = new ColumnMapper();

  console.log('🔧 無効な日付を修正中...\n');

  const problemSellers = ['AA5214', 'AA5215', 'AA5216', 'AA5217', 'AA5218', 'AA5219', 'AA5220'];

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();

  const rowMap = new Map();
  for (const row of rows) {
    const sellerNumber = String(row['売主番号'] || '');
    if (sellerNumber) {
      rowMap.set(sellerNumber, row);
    }
  }

  let fixedCount = 0;

  for (const sellerNumber of problemSellers) {
    try {
      const { data: seller, error: findError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (findError) {
        console.log(`⚠️  ${sellerNumber}: 見つかりません`);
        continue;
      }

      const row = rowMap.get(sellerNumber);
      if (!row) {
        console.log(`⚠️  ${sellerNumber}: スプレッドシートに見つかりません`);
        continue;
      }

      // データ変換
      const sellerData = columnMapper.mapToDatabase(row);

      // 無効な日付を修正
      const dateFields = ['inquiry_date', 'visit_date', 'next_call_date', 'contract_year_month'];
      for (const field of dateFields) {
        if (sellerData[field] === '2026-02-29') {
          sellerData[field] = '2026-02-28';
          console.log(`   ${sellerNumber}: ${field}を2026-02-29 → 2026-02-28に修正`);
        }
      }

      // 更新
      const { error: updateError } = await supabase
        .from('sellers')
        .update(sellerData as any)
        .eq('id', seller.id);

      if (updateError) {
        console.error(`❌ ${sellerNumber}: ${updateError.message}`);
      } else {
        console.log(`✅ ${sellerNumber}: 更新成功`);
        fixedCount++;
      }
    } catch (error: any) {
      console.error(`❌ ${sellerNumber}: ${error.message}`);
    }
  }

  console.log(`\n✅ ${fixedCount}件の売主を修正しました`);
}

fixInvalidDates().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
