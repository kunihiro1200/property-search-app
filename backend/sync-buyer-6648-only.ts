// 買主6648のみを同期
import { config } from 'dotenv';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncBuyer6648() {
  try {
    console.log('=== 買主6648のみを同期 ===\n');

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    console.log('1. ヘッダーを取得中...');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`   ✓ ${headers.length}個のカラム\n`);

    // データ取得
    console.log('2. 買主6648のデータを取得中...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    
    const buyerNumberIndex = headers.findIndex(h => h === '買主番号');
    const buyer6648Row = rows.find(row => row[buyerNumberIndex] === '6648');

    if (!buyer6648Row) {
      console.log('   ✗ 買主6648が見つかりません');
      return;
    }
    console.log('   ✓ 買主6648を発見\n');

    // マッピング
    console.log('3. データをマッピング中...');
    const mapper = new BuyerColumnMapper();
    const data = mapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
    
    console.log('   マッピング結果（主要フィールド）:');
    console.log(`   - buyer_number: "${data.buyer_number}"`);
    console.log(`   - name: "${data.name}"`);
    console.log(`   - email: "${data.email}"`);
    console.log(`   - phone_number: "${data.phone_number}"`);
    console.log(`   - property_number: "${data.property_number}"`);
    console.log(`   - display_address: "${data.display_address}"`);
    console.log(`   - price: "${data.price}"`);
    console.log(`   - property_address: "${data.property_address}"`);
    console.log(`   - building_name_price: "${data.building_name_price}"`);
    console.log('');

    // データベースに挿入
    console.log('4. データベースに挿入中（全フィールド）...');
    const { data: inserted, error } = await supabase
      .from('buyers')
      .upsert(data, { onConflict: 'buyer_number' })
      .select();

    if (error) {
      console.log(`   ✗ エラー: ${error.message}`);
      console.log(`   詳細: ${JSON.stringify(error, null, 2)}`);
      
      // エラーの詳細を分析
      if (error.message.includes('column')) {
        console.log('\n   ⚠️ カラム関連のエラーです');
        console.log('   送信しようとしたデータのキー:');
        Object.keys(data).forEach(key => {
          console.log(`      - ${key}`);
        });
      }
    } else {
      console.log(`   ✓ 成功！`);
      if (inserted && inserted.length > 0) {
        console.log(`   ID: ${inserted[0].id}`);
      }
    }

  } catch (error: any) {
    console.error('\nエラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

syncBuyer6648();
