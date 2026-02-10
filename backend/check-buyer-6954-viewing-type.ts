import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as path from 'path';

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });
config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const BUYER_NUMBER = '6954';

async function checkBuyer6954() {
  console.log(`🔍 Checking buyer ${BUYER_NUMBER}...\n`);

  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // スプレッドシートから全データを取得
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

  // カラムインデックスを取得
  const buyerNumberIndex = headers.indexOf('買主番号');
  const viewingTypeIndex = headers.indexOf('内覧形態');

  console.log(`📋 Column indexes:`);
  console.log(`   買主番号: ${buyerNumberIndex}`);
  console.log(`   内覧形態: ${viewingTypeIndex}\n`);

  // 買主6954を探す
  let found = false;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const buyerNumber = row[buyerNumberIndex];

    if (buyerNumber === BUYER_NUMBER) {
      found = true;
      const sheetViewingType = row[viewingTypeIndex];

      console.log(`✅ Found buyer ${BUYER_NUMBER} in spreadsheet (row ${i + 2})`);
      console.log(`   Spreadsheet viewing_type: "${sheetViewingType || ''}"`);
      console.log('');

      // DBから取得
      const { data: dbBuyer, error } = await supabase
        .from('buyers')
        .select('buyer_number, viewing_type, updated_at, last_synced_at')
        .eq('buyer_number', BUYER_NUMBER)
        .single();

      if (error) {
        console.log(`❌ Error fetching from DB: ${error.message}`);
        return;
      }

      if (!dbBuyer) {
        console.log(`❌ Buyer ${BUYER_NUMBER} not found in DB`);
        return;
      }

      console.log(`✅ Found buyer ${BUYER_NUMBER} in database`);
      console.log(`   Database viewing_type: "${dbBuyer.viewing_type || ''}"`);
      console.log(`   Last updated: ${dbBuyer.updated_at}`);
      console.log(`   Last synced: ${dbBuyer.last_synced_at || 'Never'}`);
      console.log('');

      // 比較
      const sheetValue = (sheetViewingType || '').trim();
      const dbValue = (dbBuyer.viewing_type || '').trim();

      if (sheetValue === dbValue) {
        console.log(`✅ viewing_type matches!`);
      } else {
        console.log(`❌ viewing_type MISMATCH!`);
        console.log(`   Expected (from sheet): "${sheetValue}"`);
        console.log(`   Actual (in DB):        "${dbValue}"`);
        console.log('');
        console.log(`🔧 Recommendation: Run manual sync for buyer ${BUYER_NUMBER}`);
      }

      break;
    }
  }

  if (!found) {
    console.log(`❌ Buyer ${BUYER_NUMBER} not found in spreadsheet`);
  }
}

checkBuyer6954().catch(console.error);
