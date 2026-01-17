/**
 * 業務依頼スプレッドシートのヘッダー（カラム名）を取得するスクリプト
 */
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
const SHEET_NAME = '業務依頼';

async function getWorkSheetHeaders() {
  try {
    // サービスアカウント認証
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー行を取得（1行目）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const headers = response.data.values?.[0] || [];
    
    console.log('=== 業務依頼スプレッドシート ヘッダー情報 ===');
    console.log(`スプレッドシートID: ${SPREADSHEET_ID}`);
    console.log(`シート名: ${SHEET_NAME}`);
    console.log(`カラム数: ${headers.length}`);
    console.log('\n=== カラム一覧 ===');
    
    headers.forEach((header: string, index: number) => {
      const colLetter = getColumnLetter(index);
      console.log(`${index + 1}. [${colLetter}] ${header || '(空)'}`);
    });

    // カテゴリ別に分類を試みる
    console.log('\n=== カテゴリ別分類（推定） ===');
    const categories: Record<string, string[]> = {
      '物件基本情報': [],
      '媒介契約関連': [],
      'サイト登録関連': [],
      '売買契約関連': [],
      '決済関連': [],
      'その他': [],
    };

    headers.forEach((header: string, index: number) => {
      if (!header) return;
      const h = header.toLowerCase();
      
      if (h.includes('物件') || h.includes('番号') || h.includes('住所') || h.includes('名前')) {
        categories['物件基本情報'].push(`[${index + 1}] ${header}`);
      } else if (h.includes('媒介') || h.includes('専任') || h.includes('一般')) {
        categories['媒介契約関連'].push(`[${index + 1}] ${header}`);
      } else if (h.includes('サイト') || h.includes('登録') || h.includes('掲載')) {
        categories['サイト登録関連'].push(`[${index + 1}] ${header}`);
      } else if (h.includes('売買') || h.includes('契約') || h.includes('重説')) {
        categories['売買契約関連'].push(`[${index + 1}] ${header}`);
      } else if (h.includes('決済') || h.includes('引渡') || h.includes('精算')) {
        categories['決済関連'].push(`[${index + 1}] ${header}`);
      } else {
        categories['その他'].push(`[${index + 1}] ${header}`);
      }
    });

    for (const [category, cols] of Object.entries(categories)) {
      if (cols.length > 0) {
        console.log(`\n【${category}】(${cols.length}カラム)`);
        cols.forEach(col => console.log(`  ${col}`));
      }
    }

    // JSON形式でも出力
    console.log('\n=== JSON形式（カラムマッピング用） ===');
    const headerMapping: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      if (header) {
        // スネークケースに変換
        const snakeCase = toSnakeCase(header);
        headerMapping[header] = snakeCase;
      }
    });
    console.log(JSON.stringify(headerMapping, null, 2));

  } catch (error) {
    console.error('エラー:', error);
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function toSnakeCase(str: string): string {
  // 日本語はそのまま、英数字はスネークケースに
  return str
    .replace(/[\s\n\r]+/g, '_')
    .replace(/[（）()]/g, '')
    .replace(/[・]/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

getWorkSheetHeaders();
