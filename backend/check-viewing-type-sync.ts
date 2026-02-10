import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });
config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkViewingTypeSync() {
  console.log('🔍 Checking viewing_type sync status...\n');

  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 買主スプレッドシートから全データを取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:ZZ`,
  });

  const allRows = response.data.values;
  if (!allRows || allRows.length === 0) {
    console.log('❌ No data found in spreadsheet');
    return;
  }

  const headers = allRows[0];
  const dataRows = allRows.slice(1);

  // 内覧形態カラムのインデックスを取得
  const viewingTypeIndex = headers.indexOf('内覧形態');
  const buyerNumberIndex = headers.indexOf('買主番号');

  if (viewingTypeIndex === -1) {
    console.log('❌ 内覧形態 column not found in spreadsheet');
    return;
  }

  if (buyerNumberIndex === -1) {
    console.log('❌ 買主番号 column not found in spreadsheet');
    return;
  }

  console.log(`✅ Found 内覧形態 at column index ${viewingTypeIndex}`);
  console.log(`✅ Found 買主番号 at column index ${buyerNumberIndex}\n`);

  // 内覧形態に値が入っている買主を探す
  const mapper = new BuyerColumnMapper();
  let checkedCount = 0;
  let mismatchCount = 0;
  let foundCount = 0;

  console.log('🔍 Searching for buyers with viewing_type...\n');

  for (let i = 0; i < dataRows.length && foundCount < 10; i++) {
    const row = dataRows[i];
    const buyerNumber = row[buyerNumberIndex];
    const sheetViewingType = row[viewingTypeIndex];

    if (!buyerNumber) continue;
    if (!sheetViewingType || sheetViewingType.trim() === '') continue;

    foundCount++;

    // DBから取得
    const { data: dbBuyer, error } = await supabase
      .from('buyers')
      .select('buyer_number, viewing_type')
      .eq('buyer_number', buyerNumber)
      .single();

    if (error || !dbBuyer) {
      console.log(`⚠️  Buyer ${buyerNumber}: Not found in DB`);
      continue;
    }

    checkedCount++;

    // 比較
    const sheetValue = sheetViewingType.trim();
    const dbValue = (dbBuyer.viewing_type || '').trim();

    if (sheetValue !== dbValue) {
      mismatchCount++;
      console.log(`❌ Buyer ${buyerNumber}:`);
      console.log(`   Spreadsheet: "${sheetValue}"`);
      console.log(`   Database:    "${dbValue}"`);
      console.log('');
    } else {
      console.log(`✅ Buyer ${buyerNumber}: viewing_type matches ("${sheetValue}")`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Checked: ${checkedCount} buyers`);
  console.log(`   Mismatches: ${mismatchCount}`);
  console.log(`   Match rate: ${((checkedCount - mismatchCount) / checkedCount * 100).toFixed(1)}%`);
}

checkViewingTypeSync().catch(console.error);
