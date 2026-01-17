import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnoseBuyer6648() {
  console.log('=== 買主6648のスプレッドシートデータ診断 ===\n');

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
  console.log(`ヘッダー数: ${headers.length}\n`);

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`総行数: ${rows.length}\n`);

  // 買主6648を探す
  let buyer6648Row: any[] | null = null;
  let buyer6648RowNumber = -1;
  let buyer6647Row: any[] | null = null;
  let buyer6647RowNumber = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[0]; // 買主番号は最初のカラム
    
    if (String(buyerNumber).trim() === '6648') {
      buyer6648Row = row;
      buyer6648RowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed
    }
    if (String(buyerNumber).trim() === '6647') {
      buyer6647Row = row;
      buyer6647RowNumber = i + 2;
    }
  }

  if (!buyer6648Row) {
    console.log('❌ 買主6648が見つかりません');
    return;
  }

  console.log(`✅ 買主6648が見つかりました（行番号: ${buyer6648RowNumber}）\n`);

  if (buyer6647Row) {
    console.log(`✅ 買主6647も見つかりました（行番号: ${buyer6647RowNumber}）\n`);
  }

  // 6648のデータを詳細に表示
  console.log('=== 買主6648の生データ ===');
  console.log(`カラム数: ${buyer6648Row.length}`);
  console.log(`ヘッダー数: ${headers.length}`);
  console.log();

  // 最初の20カラムを表示
  console.log('最初の20カラム:');
  for (let i = 0; i < Math.min(20, buyer6648Row.length); i++) {
    const value = buyer6648Row[i];
    const header = headers[i] || `カラム${i}`;
    console.log(`  [${i}] ${header}: "${value}" (型: ${typeof value}, 長さ: ${String(value).length})`);
  }
  console.log();

  // 6647と6648の違いを比較
  if (buyer6647Row) {
    console.log('=== 買主6647と6648の違い ===');
    let differences = 0;
    
    for (let i = 0; i < Math.max(buyer6647Row.length, buyer6648Row.length); i++) {
      const val6647 = buyer6647Row[i] || '';
      const val6648 = buyer6648Row[i] || '';
      
      if (val6647 !== val6648) {
        differences++;
        const header = headers[i] || `カラム${i}`;
        console.log(`  [${i}] ${header}:`);
        console.log(`    6647: "${val6647}"`);
        console.log(`    6648: "${val6648}"`);
      }
    }
    
    console.log(`\n総違い数: ${differences}`);
  }

  // 特殊文字や問題のある文字をチェック
  console.log('\n=== 特殊文字チェック ===');
  for (let i = 0; i < buyer6648Row.length; i++) {
    const value = String(buyer6648Row[i] || '');
    const header = headers[i] || `カラム${i}`;
    
    // 制御文字をチェック
    if (/[\x00-\x1F\x7F-\x9F]/.test(value)) {
      console.log(`⚠️  [${i}] ${header}: 制御文字が含まれています`);
    }
    
    // 非常に長い値をチェック
    if (value.length > 255) {
      console.log(`⚠️  [${i}] ${header}: 値が長すぎます (${value.length}文字)`);
    }
    
    // NULL文字をチェック
    if (value.includes('\0')) {
      console.log(`⚠️  [${i}] ${header}: NULL文字が含まれています`);
    }
  }

  // カラムマッピングをシミュレート
  console.log('\n=== カラムマッピングシミュレーション ===');
  try {
    const { BuyerColumnMapper } = require('./src/services/BuyerColumnMapper');
    const mapper = new BuyerColumnMapper();
    const mappedData = mapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
    
    console.log('✅ マッピング成功');
    console.log('マッピングされたフィールド:');
    Object.keys(mappedData).forEach(key => {
      const value = mappedData[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`  ${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
      }
    });
  } catch (error: any) {
    console.log('❌ マッピングエラー:', error.message);
  }
}

diagnoseBuyer6648().catch(console.error);
