import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function findNikataBuyers() {
  console.log('=== にけた（二形）さんの買主データを検索 ===\n');

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

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];

  console.log(`総行数: ${rows.length}\n`);

  // 名前と電話番号のカラムインデックスを探す
  const nameIndex = headers.findIndex(h => h === '名前' || h === '氏名');
  const phoneIndex = headers.findIndex(h => h === '電話番号');

  console.log(`名前カラム: ${nameIndex} (${headers[nameIndex]})`);
  console.log(`電話番号カラム: ${phoneIndex} (${headers[phoneIndex]})\n`);

  // にけた/二形を含む行を探す
  const nikataBuyers: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[0];
    const name = nameIndex >= 0 ? row[nameIndex] : '';
    const phone = phoneIndex >= 0 ? row[phoneIndex] : '';

    if (name && (name.includes('にけた') || name.includes('二形') || name.includes('ニケタ'))) {
      nikataBuyers.push({
        rowNumber: i + 2,
        buyerNumber,
        name,
        phone,
        row
      });
    }
  }

  console.log(`見つかった買主数: ${nikataBuyers.length}\n`);

  nikataBuyers.forEach(buyer => {
    console.log(`買主番号: ${buyer.buyerNumber}`);
    console.log(`  行番号: ${buyer.rowNumber}`);
    console.log(`  名前: ${buyer.name}`);
    console.log(`  電話番号: ${buyer.phone}`);
    console.log();
  });

  // 買主6647と6648を特定検索
  console.log('=== 買主6647と6648の検索 ===');
  const buyer6647 = rows.find((row, i) => {
    const buyerNumber = String(row[0] || '').trim();
    if (buyerNumber === '6647') {
      console.log(`✅ 買主6647が見つかりました（行番号: ${i + 2}）`);
      console.log(`  名前: ${nameIndex >= 0 ? row[nameIndex] : 'N/A'}`);
      console.log(`  電話番号: ${phoneIndex >= 0 ? row[phoneIndex] : 'N/A'}`);
      return true;
    }
    return false;
  });

  const buyer6648 = rows.find((row, i) => {
    const buyerNumber = String(row[0] || '').trim();
    if (buyerNumber === '6648') {
      console.log(`✅ 買主6648が見つかりました（行番号: ${i + 2}）`);
      console.log(`  名前: ${nameIndex >= 0 ? row[nameIndex] : 'N/A'}`);
      console.log(`  電話番号: ${phoneIndex >= 0 ? row[phoneIndex] : 'N/A'}`);
      return true;
    }
    return false;
  });

  if (!buyer6647) {
    console.log('❌ 買主6647が見つかりません');
  }
  if (!buyer6648) {
    console.log('❌ 買主6648が見つかりません');
  }
}

findNikataBuyers().catch(console.error);
