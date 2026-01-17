import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function syncBuyer6648() {
  console.log('=== 買主6648をスプレッドシートから同期 ===\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`ヘッダー数: ${headers.length}`);

    // 全データ取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];

    // 買主番号のカラムインデックスを探す
    const buyerNumberIndex = headers.findIndex(h => 
      h === '買主番号' || h === 'buyer_number' || h.includes('買主番号')
    );

    if (buyerNumberIndex === -1) {
      console.error('❌ 買主番号カラムが見つかりません');
      return;
    }

    // 買主6648を探す
    const buyer6648Row = rows.find(row => {
      const buyerNumber = row[buyerNumberIndex];
      return buyerNumber && String(buyerNumber).trim() === '6648';
    });

    if (!buyer6648Row) {
      console.log('❌ 買主6648がスプレッドシートに見つかりません');
      return;
    }

    console.log('✅ 買主6648が見つかりました\n');

    // カラムマッパーを使用してデータをマッピング
    const columnMapper = new BuyerColumnMapper();
    const mappedData = columnMapper.mapSpreadsheetToDatabase(headers, buyer6648Row);

    console.log('マッピングされたデータ:');
    console.log('  買主番号:', mappedData.buyer_number);
    console.log('  氏名:', mappedData.name);
    console.log('  物件番号:', mappedData.property_number);
    console.log('  建物名/価格:', mappedData.building_name_price);
    console.log('  物件所在地:', mappedData.property_address);
    console.log('  住居表示:', mappedData.display_address);
    console.log('  価格:', mappedData.price);
    console.log('');

    // データベースに同期
    console.log('データベースに同期中...');
    const { error } = await supabase
      .from('buyers')
      .upsert(mappedData, { onConflict: 'buyer_number' })
      .select();

    if (error) {
      console.error('❌ 同期エラー:', error.message);
      return;
    }

    console.log('✅ 同期成功\n');

    // 同期後のデータを確認
    const { data: syncedData, error: fetchError } = await supabase
      .from('buyers')
      .select('buyer_number, name, property_number, building_name_price, property_address, display_address, price')
      .eq('buyer_number', 6648)
      .single();

    if (fetchError) {
      console.error('❌ データ取得エラー:', fetchError.message);
      return;
    }

    console.log('同期後のデータベースの値:');
    console.log('  買主番号:', syncedData.buyer_number);
    console.log('  氏名:', syncedData.name);
    console.log('  物件番号:', syncedData.property_number);
    console.log('  建物名/価格:', syncedData.building_name_price || '(空)');
    console.log('  物件所在地:', syncedData.property_address || '(空)');
    console.log('  住居表示:', syncedData.display_address || '(空)');
    console.log('  価格:', syncedData.price || '(空)');

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

syncBuyer6648();
