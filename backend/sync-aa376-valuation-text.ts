/**
 * AA376の査定額テキスト（I列）を同期するスクリプト
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== AA376 査定額テキスト同期 ===\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Initialize Google Sheets
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Get headers to find I列 (査定額)
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:CZ1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // Find column indices
  const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
  const valuationTextIndex = headers.findIndex((h: string) => h === '査定額');
  
  console.log('ヘッダー情報:');
  console.log(`  売主番号列: ${sellerNumberIndex} (${headers[sellerNumberIndex]})`);
  console.log(`  査定額列: ${valuationTextIndex} (${headers[valuationTextIndex]})`);
  
  if (valuationTextIndex === -1) {
    console.log('\n❌ 「査定額」列が見つかりません');
    console.log('ヘッダー一覧（最初の20列）:', headers.slice(0, 20));
    return;
  }

  // Get all data
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:CZ`,
  });
  const rows = dataResponse.data.values || [];
  
  // Find AA376
  let aa376Row: string[] | null = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber === 'AA376') {
      aa376Row = row;
      console.log(`\n✅ AA376を発見（行 ${i + 1}）`);
      break;
    }
  }

  if (!aa376Row) {
    console.log('\n❌ AA376が見つかりません');
    return;
  }

  const valuationText = aa376Row[valuationTextIndex] || '';
  console.log(`\n📊 スプレッドシートのデータ:`);
  console.log(`  売主番号: ${aa376Row[sellerNumberIndex]}`);
  console.log(`  査定額（I列）: "${valuationText}"`);

  // Update database
  console.log('\n📝 データベースを更新中...');
  const { data, error } = await supabase
    .from('sellers')
    .update({ valuation_text: valuationText })
    .eq('seller_number', 'AA376')
    .select('seller_number, valuation_text, valuation_amount_1, valuation_amount_2, valuation_amount_3');

  if (error) {
    console.log(`❌ エラー: ${error.message}`);
    return;
  }

  console.log('\n✅ 更新完了:');
  console.log(JSON.stringify(data, null, 2));

  // Verify
  const { data: verifyData } = await supabase
    .from('sellers')
    .select('seller_number, valuation_text, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA376')
    .single();

  console.log('\n📊 データベースの最終状態:');
  console.log(JSON.stringify(verifyData, null, 2));
}

main().catch(console.error);
