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
const BUYER_NUMBER = '6954';

async function syncBuyer6954ViewingMobile() {
  console.log(`🔄 Syncing buyer ${BUYER_NUMBER} viewing_mobile...\n`);

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

  // 買主6954を探す
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const buyerNumber = row[buyerNumberIndex];

    if (buyerNumber === BUYER_NUMBER) {
      const sheetViewingType = row[viewingTypeIndex];

      console.log(`✅ Found buyer ${BUYER_NUMBER} in spreadsheet`);
      console.log(`   Spreadsheet 内覧形態: "${sheetViewingType || ''}"`);
      console.log('');

      // マッパーを使用してDBフォーマットに変換
      const mapper = new BuyerColumnMapper();
      const mappedData = mapper.mapSpreadsheetToDatabase(headers, row);

      console.log(`📝 Mapped data:`);
      console.log(`   viewing_mobile: "${mappedData.viewing_mobile || ''}"`);
      console.log(`   viewing_type: "${mappedData.viewing_type || ''}"`);
      console.log('');

      // DBを更新
      const { error } = await supabase
        .from('buyers')
        .update({
          viewing_mobile: mappedData.viewing_mobile,
          updated_at: new Date().toISOString(),
        })
        .eq('buyer_number', BUYER_NUMBER);

      if (error) {
        console.log(`❌ Error updating DB: ${error.message}`);
        return;
      }

      console.log(`✅ Successfully updated buyer ${BUYER_NUMBER}`);
      console.log('');

      // 確認
      const { data: dbBuyer } = await supabase
        .from('buyers')
        .select('buyer_number, viewing_mobile, viewing_type, updated_at')
        .eq('buyer_number', BUYER_NUMBER)
        .single();

      if (dbBuyer) {
        console.log(`📊 Database after update:`);
        console.log(`   viewing_mobile: "${dbBuyer.viewing_mobile || ''}"`);
        console.log(`   viewing_type: "${dbBuyer.viewing_type || ''}"`);
        console.log(`   updated_at: ${dbBuyer.updated_at}`);
      }

      break;
    }
  }
}

syncBuyer6954ViewingMobile().catch(console.error);
