import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function checkBuyer6648FromSheet() {
  console.log('=== スプレッドシートから買主6648を確認 ===\n');

  try {
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
    console.log(`総行数: ${rows.length}\n`);

    // 買主番号のカラムインデックスを探す
    const buyerNumberIndex = headers.findIndex(h => 
      h === '買主番号' || h === 'buyer_number' || h.includes('買主番号')
    );

    if (buyerNumberIndex === -1) {
      console.error('❌ 買主番号カラムが見つかりません');
      return;
    }

    console.log(`買主番号カラムインデックス: ${buyerNumberIndex} (${headers[buyerNumberIndex]})\n`);

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

    // 物件関連のカラムを探す
    const propertyColumns = [
      '物件番号',
      '建物名/価格',
      '物件所在地',
      '住居表示',
      '価格',
      'property_number',
      'building_name_price',
      'property_address',
      'display_address',
      'price'
    ];

    console.log('物件関連フィールド:');
    propertyColumns.forEach(colName => {
      const index = headers.findIndex(h => 
        h === colName || h.includes(colName)
      );
      if (index !== -1) {
        const value = buyer6648Row[index] || '(空)';
        console.log(`  ${headers[index]}: ${value}`);
      }
    });

    // すべてのフィールドを表示（デバッグ用）
    console.log('\n全フィールド（最初の20個）:');
    for (let i = 0; i < Math.min(20, headers.length); i++) {
      const value = buyer6648Row[i] || '(空)';
      console.log(`  [${i}] ${headers[i]}: ${value}`);
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkBuyer6648FromSheet();
