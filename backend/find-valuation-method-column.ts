import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findValuationMethodColumn() {
  try {
    console.log('=== 査定方法カラムを探索 ===');

    // Google Sheets認証
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // より広い範囲でヘッダーを取得（A列からZZ列まで）
    console.log('📊 スプレッドシートからヘッダーを取得中...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!A1:ZZ1', // 1行目の全列
    });

    const headers = response.data.values?.[0] || [];
    console.log(`✅ ${headers.length}個のカラムを発見`);
    console.log('');

    // 全ヘッダーを表示（インデックス付き）
    headers.forEach((header: string, index: number) => {
      const columnLetter = getColumnLetter(index);
      console.log(`${columnLetter}列 (${index}): ${header}`);
    });

    console.log('');

    // 「査定」を含むカラムを検索
    console.log('=== 「査定」を含むカラム ===');
    headers.forEach((header: string, index: number) => {
      if (header && header.includes('査定')) {
        const columnLetter = getColumnLetter(index);
        console.log(`✅ ${columnLetter}列 (${index}): ${header}`);
      }
    });

    console.log('');

    // 「方法」を含むカラムを検索
    console.log('=== 「方法」を含むカラム ===');
    headers.forEach((header: string, index: number) => {
      if (header && header.includes('方法')) {
        const columnLetter = getColumnLetter(index);
        console.log(`✅ ${columnLetter}列 (${index}): ${header}`);
      }
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// インデックスから列文字を取得（0 -> A, 1 -> B, 26 -> AA, etc.）
function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

findValuationMethodColumn();
