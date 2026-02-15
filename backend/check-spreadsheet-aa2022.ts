import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSpreadsheetAA2022() {
  console.log('スプレッドシートのAA2022データを確認中...\n');

  // Google Sheets API認証
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.error('GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません');
    return;
  }

  // スプレッドシートからデータを取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '業務リスト!A1:ZZ1000', // ヘッダー行とデータ行を取得
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log('データが見つかりません');
    return;
  }

  // ヘッダー行を取得
  const headers = rows[0];
  console.log('=== ヘッダー行 ===');
  console.log('列数:', headers.length);

  // 重要なカラムのインデックスを探す
  const columnIndexes: { [key: string]: number } = {};
  const importantColumns = [
    '物件番号',
    '広瀬さんへ依頼（売買契約関連）',
    'CWへ依頼（売買契約関連）',
    'コメント（売買契約）',
    '作業完了コメント',
    '廣瀬さんへ完了チャット（売買関連）',
    'CWへ完了チャット（売買関連）',
    '完了コメント（売買関連）',
  ];

  importantColumns.forEach(col => {
    const index = headers.indexOf(col);
    if (index !== -1) {
      columnIndexes[col] = index;
      console.log(`✅ ${col}: 列${index + 1} (${String.fromCharCode(65 + index)})`);
    } else {
      console.log(`❌ ${col}: 見つかりません`);
    }
  });

  // AA2022の行を探す
  console.log('\n=== AA2022のデータ ===\n');
  const propertyNumberIndex = columnIndexes['物件番号'];
  
  if (propertyNumberIndex === undefined) {
    console.log('物件番号カラムが見つかりません');
    return;
  }

  let aa2022Row: string[] | null = null;
  let aa2022RowNumber = -1;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[propertyNumberIndex] === 'AA2022') {
      aa2022Row = row;
      aa2022RowNumber = i + 1; // 1-indexed
      break;
    }
  }

  if (!aa2022Row) {
    console.log('AA2022が見つかりません');
    return;
  }

  console.log(`行番号: ${aa2022RowNumber}\n`);

  // 重要なカラムの値を表示
  importantColumns.forEach(col => {
    const index = columnIndexes[col];
    if (index !== undefined) {
      const value = aa2022Row![index] || '(空)';
      const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`${col}:`);
      console.log(`  値: "${displayValue}"`);
      console.log(`  長さ: ${value.length}文字`);
      console.log(`  型: ${typeof value}`);
      console.log();
    }
  });
}

checkSpreadsheetAA2022().catch(console.error);
