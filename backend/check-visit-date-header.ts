/**
 * スプレッドシートの訪問日ヘッダーを正確に確認
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = '売主リスト';

async function main() {
  console.log('=== 訪問日ヘッダーを正確に確認 ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];

  // 訪問関連のヘッダーを探す
  console.log('訪問関連のヘッダー:');
  headers.forEach((h: string, i: number) => {
    if (h && h.includes('訪問')) {
      // 文字コードを表示
      const charCodes = [...h].map(c => c.charCodeAt(0));
      console.log(`  列${i + 1}: "${h}"`);
      console.log(`    文字コード: [${charCodes.join(', ')}]`);
      console.log(`    長さ: ${h.length}`);
    }
  });

  // column-mapping.jsonで使用しているキーと比較
  const expectedKey = '訪問日 Y/M/D';
  const expectedCharCodes = [...expectedKey].map(c => c.charCodeAt(0));
  console.log(`\ncolumn-mapping.jsonのキー: "${expectedKey}"`);
  console.log(`  文字コード: [${expectedCharCodes.join(', ')}]`);
  console.log(`  長さ: ${expectedKey.length}`);

  // 一致するヘッダーを探す
  const matchingIndex = headers.findIndex((h: string) => h === expectedKey);
  if (matchingIndex >= 0) {
    console.log(`\n✅ 一致するヘッダーが見つかりました: 列${matchingIndex + 1}`);
  } else {
    console.log('\n❌ 一致するヘッダーが見つかりません');
    
    // 部分一致を探す
    const partialMatch = headers.findIndex((h: string) => h && h.includes('訪問日'));
    if (partialMatch >= 0) {
      console.log(`  部分一致: 列${partialMatch + 1} = "${headers[partialMatch]}"`);
    }
  }
}

main().catch(console.error);
